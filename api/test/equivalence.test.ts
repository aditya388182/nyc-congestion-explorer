import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeEstimate } from "../src/estimator/estimate.js";
import type { EstimateRequest } from "../src/estimator/estimate.js";
import { REPO, readResultsJson, sharedData, stamp } from "./helpers.js";

/** SPEC 9.3: TypeScript beta and SE match statsmodels within 1e-8 relative. */
const EQUIV_REL_TOL = 1e-8;

interface Case {
  kind: string;
  input: { tripType: string; control: "A" | "B" | "AB"; dropBoundary: boolean; outcome: string; excludeZones: number[]; placeboStart: string | null };
  expected: { beta: number; se: number; effectPct: number; ciLowPct: number; ciHighPct: number; nTreated: number; nControl: number; nWeeks: number; nObs: number; droppedZones: number[] };
}

const rel = (a: number, b: number): number => Math.abs(a - b) / Math.max(Math.abs(b), Number.MIN_VALUE);

describe("TypeScript estimator vs statsmodels reference (results/estimator_reference.json)", () => {
  const ref = readResultsJson("estimator_reference") as { n_cases: number; cases: Case[] };
  const data = sharedData();

  it("has the 61 reference cases", () => {
    expect(ref.n_cases).toBe(61);
    expect(ref.cases).toHaveLength(61);
  });

  it("matches beta and SE on every case, and records the largest differences", () => {
    let maxBeta = 0;
    let maxSe = 0;
    let maxPct = 0;
    let worst = "";
    for (const c of ref.cases) {
      const req: EstimateRequest = {
        tripType: c.input.tripType.toLowerCase() as EstimateRequest["tripType"],
        control: c.input.control,
        dropBoundary: c.input.dropBoundary,
        outcome: c.input.outcome.toLowerCase() as EstimateRequest["outcome"],
        excludeZones: c.input.excludeZones,
        placeboStart: c.input.placeboStart,
      };
      const got = computeEstimate(data, req);
      const db = rel(got.beta, c.expected.beta);
      const ds = rel(got.se, c.expected.se);
      if (db > maxBeta) { maxBeta = db; worst = JSON.stringify(c.input); }
      maxSe = Math.max(maxSe, ds);
      maxPct = Math.max(maxPct, rel(got.effectPct, c.expected.effectPct));
      expect(db, `beta ${JSON.stringify(c.input)}`).toBeLessThan(EQUIV_REL_TOL);
      expect(ds, `se ${JSON.stringify(c.input)}`).toBeLessThan(EQUIV_REL_TOL);
      expect([got.nTreated, got.nControl, got.nWeeks, got.nObs]).toEqual([c.expected.nTreated, c.expected.nControl, c.expected.nWeeks, c.expected.nObs]);
      expect(got.droppedZones).toEqual(c.expected.droppedZones);
    }
    writeFileSync(
      join(REPO, "results", "estimator_equivalence.json"),
      JSON.stringify(
        { n_cases: ref.cases.length, tolerance_rel: EQUIV_REL_TOL, max_rel_diff_beta: maxBeta, max_rel_diff_se: maxSe, max_rel_diff_effect_pct: maxPct,
          max_rel_diff: Math.max(maxBeta, maxSe), worst_case_for_beta: worst, reference: "results/estimator_reference.json (statsmodels)",
          ...stamp("npm run -w api test"), },
        null, 1,
      ),
    );
  });
});
