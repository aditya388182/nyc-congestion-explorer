import { GraphQLError } from "graphql";
import { z } from "zod";
import { MAX_EXCLUDED_ZONES, TOLL_START, UserInputError } from "./estimator/estimate.js";
import type { EstimateRequest } from "./estimator/estimate.js";
import type { DataStore } from "./store/dataStore.js";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "placeboStart must be an ISO date (YYYY-MM-DD)")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "placeboStart is not a real calendar date")
  .refine((s) => s < TOLL_START, `placeboStart must be before ${TOLL_START}`);

export const estimateInputSchema = z.object({
  tripType: z.enum(["YELLOW", "GREEN", "FHVHV", "ALL"]),
  control: z.enum(["A", "B", "AB"]),
  dropBoundary: z.boolean(),
  outcome: z.enum(["DROPOFFS", "PICKUPS"]),
  excludeZones: z.array(z.number().int()).max(MAX_EXCLUDED_ZONES, `at most ${MAX_EXCLUDED_ZONES} excluded zones`).nullish(),
  placeboStart: isoDate.nullish(),
});

export function badUserInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

/** Validate untrusted GraphQL input with zod and normalise it; throws BAD_USER_INPUT. */
export function parseEstimateInput(raw: unknown, data: DataStore): EstimateRequest {
  const r = estimateInputSchema.safeParse(raw);
  if (!r.success) throw badUserInput(r.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
  const v = r.data;
  const exclude = [...new Set(v.excludeZones ?? [])].sort((a, b) => a - b);
  const unknown = exclude.filter((id) => !data.zoneById.has(id));
  if (unknown.length > 0) throw badUserInput(`unknown zone id(s): ${unknown.join(", ")}`);
  return {
    tripType: v.tripType.toLowerCase() as EstimateRequest["tripType"],
    control: v.control,
    dropBoundary: v.dropBoundary,
    outcome: v.outcome.toLowerCase() as EstimateRequest["outcome"],
    excludeZones: exclude,
    placeboStart: v.placeboStart ?? null,
  };
}

export { UserInputError };
