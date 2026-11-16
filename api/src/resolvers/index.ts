import { GraphQLError, GraphQLScalarType } from "graphql";
import type { Resolvers } from "../generated/graphql.js";
import { UserInputError } from "../estimator/estimate.js";
import { badUserInput, parseEstimateInput } from "../input.js";
import type { Json } from "../store/dataStore.js";
import type { OutcomeKey, TripTypeKey } from "../store/panelStore.js";

const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize: (v) => v,
  parseValue: (v) => v,
});

const trip = (t: string): TripTypeKey => t.toLowerCase() as TripTypeKey;
const outcome = (o: string): OutcomeKey => o.toLowerCase() as OutcomeKey;
const num = (j: Json, k: string): number => j[k] as number;
const dropped = (j: Json): number[] => (j["dropped_zones"] as number[] | undefined) ?? [];

const fitFields = (j: Json) => ({
  beta: num(j, "beta"),
  se: num(j, "se"),
  effectPct: num(j, "effect_pct"),
  ciLowPct: num(j, "ci_low_pct"),
  ciHighPct: num(j, "ci_high_pct"),
  nTreated: num(j, "n_treated"),
  nControl: num(j, "n_control"),
  nWeeks: num(j, "n_weeks"),
  nObs: num(j, "n_obs"),
});

export const resolvers: Resolvers = {
  JSON: JSONScalar,
  Query: {
    zones: (_p, _a, { data }) => data.zones.map((z) => ({ ...z })),
    zone: (_p, { id }, { data }) => data.zoneById.get(id) ?? null,
    estimate: (_p, { input }, { data, estimates, logger }) => {
      const req = parseEstimateInput(input, data);
      try {
        const res = estimates.estimate(req);
        logger.info({ msg: "estimate", tripType: req.tripType, control: req.control, cached: res.cached, computeMs: res.computeMs });
        return res;
      } catch (e) {
        if (e instanceof UserInputError) throw badUserInput(e.message);
        throw e;
      }
    },
    eventStudy: (_p, { tripType, control }, { data }) => {
      if (tripType === "GREEN") throw badUserInput("eventStudy is precomputed for YELLOW, FHVHV and ALL only");
      const es = data.results.eventStudies.find((e) => e["tripType"] === trip(tripType) && e["control"] === control);
      if (!es) throw new GraphQLError("event study not found", { extensions: { code: "NOT_FOUND" } });
      const months = es["months"] as number[];
      const coef = es["coef"] as number[];
      const se = es["se"] as number[];
      const lo = es["ci_low_pct"] as number[];
      const hi = es["ci_high_pct"] as number[];
      const slope = es["slope"] as Json;
      return {
        tripType,
        control,
        nTreated: num(es, "nTreated"),
        nControl: num(es, "nControl"),
        nWeeks: num(es, "nWeeks"),
        nObs: num(es, "nObs"),
        points: months.map((m, i) => ({
          month: m,
          coef: coef[i] as number,
          se: se[i] as number,
          effectPct: 100 * (Math.exp(coef[i] as number) - 1),
          ciLowPct: lo[i] as number,
          ciHighPct: hi[i] as number,
        })),
        leadTest: {
          chi2: num(es, "lead_chi2"),
          df: num(es, "lead_df"),
          pChi2: num(es, "lead_p_chi2"),
          f: num(es, "lead_F"),
          pF: num(es, "lead_p_F"),
          slopePerMonthPct: 100 * (Math.exp(num(slope, "slope_per_month")) - 1),
          slopeP: num(slope, "p"),
        },
      };
    },
    placebos: (_p, _a, { data }) =>
      data.results.placebos.map((p) => ({
        start: (p["case"] as Json)["placebo_start"] as string,
        ...fitFields(p),
      })),
    specs: (_p, _a, { data }) =>
      data.results.specs.map((s) => ({
        id: s["id"] as string,
        label: s["label"] as string,
        ...fitFields(s),
        droppedZones: dropped(s),
      })),
    reconciliation: (_p, _a, { data }) => {
      const t = data.results.reconciliation.totals;
      const d = t["dropped_by_reason"] as Json;
      return {
        totals: {
          nFiles: num(t, "n_files_done"),
          raw: num(t, "total_trips_raw"),
          kept: num(t, "total_trips_kept"),
          nullZone: num(d, "null_zone"),
          unknownZone: num(d, "unknown_zone"),
          outsideMonth: num(d, "outside_month"),
          badDuration: num(d, "bad_duration"),
          unexplained: num(t, "unexplained"),
        },
        files: data.results.reconciliation.files.map((f) => ({
          tripType: f["trip_type"] as string,
          month: f["month"] as string,
          raw: num(f, "raw"),
          kept: num(f, "kept"),
          nullZone: num(f, "null_zone"),
          unknownZone: num(f, "unknown_zone"),
          outsideMonth: num(f, "outside_month"),
          badDuration: num(f, "bad_duration"),
          unexplained: num(f, "unexplained"),
        })),
      };
    },
    meta: (_p, _a, { data }) => {
      const w = data.panel.weekStarts;
      return {
        firstWeek: w[0] as string,
        lastWeek: w[w.length - 1] as string,
        nWeeks: w.length,
        nZones: data.zones.length,
        panelSha256: data.panel.meta.sha256,
        commit: data.panel.meta.commit,
        generatedAtUtc: data.panel.meta.generated_at_utc,
        headline: data.results.headline,
        planted: data.results.planted,
        spillover: data.results.spillover,
        exploratory: data.results.exploratory,
      };
    },
  },
  Zone: {
    geometry: (z, _a, { data }) => data.geometry.get(z.id) ?? { type: "GeometryCollection", geometries: [] },
    change: (z, { tripType, outcome: o }, { data }) => data.panel.change(z.id, trip(tripType), outcome(o)),
    weekly: (z, { tripType, outcome: o }, { loaders }) =>
      loaders.weekly.load({ zoneId: z.id, tripType: trip(tripType), outcome: outcome(o) }),
  },
};
