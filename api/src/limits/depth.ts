import { GraphQLError, Kind } from "graphql";
import type { FragmentDefinitionNode, SelectionSetNode, ValidationContext, ValidationRule } from "graphql";

export const MAX_QUERY_DEPTH = 6;

function depthOf(
  set: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  seen: Set<string>,
): number {
  let max = 0;
  for (const sel of set.selections) {
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value.startsWith("__")) continue; // introspection is exempt
      const child = sel.selectionSet ? depthOf(sel.selectionSet, fragments, seen) : 0;
      max = Math.max(max, 1 + child);
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      max = Math.max(max, depthOf(sel.selectionSet, fragments, seen));
    } else {
      const name = sel.name.value;
      const frag = fragments.get(name);
      if (frag && !seen.has(name)) {
        seen.add(name);
        max = Math.max(max, depthOf(frag.selectionSet, fragments, seen));
        seen.delete(name);
      }
    }
  }
  return max;
}

/** Validation rule: reject operations deeper than `limit` (QUERY_TOO_DEEP). */
export function depthLimit(limit: number = MAX_QUERY_DEPTH): ValidationRule {
  return (context: ValidationContext) => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const def of context.getDocument().definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) fragments.set(def.name.value, def);
    }
    return {
      OperationDefinition(node) {
        const depth = depthOf(node.selectionSet, fragments, new Set());
        if (depth > limit) {
          context.reportError(
            new GraphQLError(`Query is too deep: depth ${depth} exceeds the maximum of ${limit}`, {
              nodes: [node],
              extensions: { code: "QUERY_TOO_DEEP", depth, limit },
            }),
          );
        }
      },
    };
  };
}
