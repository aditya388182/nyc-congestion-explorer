import { GraphQLError } from "graphql";
import type { DocumentNode, GraphQLSchema } from "graphql";
import { getComplexity, simpleEstimator } from "graphql-query-complexity";
import type { ComplexityEstimator } from "graphql-query-complexity";

export const MAX_COMPLEXITY = 5000;
/** Cost of one zone's weekly series. */
export const WEEKLY_COST = 10;
/** Cost of one estimate (a fresh regression). */
export const ESTIMATE_COST = 50;
const EVENT_STUDY_COST = 20;
/** Fixed list sizes: a list field multiplies the cost of its children. */
const LIST_SIZES: Record<string, number> = {
  "Query.zones": 265,
  "Query.specs": 8,
  "Query.placebos": 2,
  "Reconciliation.files": 135,
  "EventStudy.points": 45,
};

const custom: ComplexityEstimator = ({ type, field, childComplexity }) => {
  const id = `${type.name}.${field.name}`;
  if (id === "Zone.weekly") return WEEKLY_COST;
  if (id === "Query.estimate") return ESTIMATE_COST;
  if (id === "Query.eventStudy") return EVENT_STUDY_COST;
  const size = LIST_SIZES[id];
  if (size !== undefined) return 1 + size * childComplexity;
  return undefined;
};

export const estimators = [custom, simpleEstimator({ defaultComplexity: 1 })];

export function operationComplexity(
  schema: GraphQLSchema,
  document: DocumentNode,
  variables: Record<string, unknown>,
  operationName?: string | null,
): number {
  return getComplexity({ schema, query: document, variables, operationName: operationName ?? undefined, estimators });
}

/** Throws QUERY_TOO_COMPLEX with the computed cost in the message. */
export function assertComplexity(cost: number, max: number = MAX_COMPLEXITY): void {
  if (cost > max) {
    throw new GraphQLError(`Query is too complex: cost ${cost} exceeds the maximum of ${max}`, {
      extensions: { code: "QUERY_TOO_COMPLEX", cost, maximum: max },
    });
  }
}
