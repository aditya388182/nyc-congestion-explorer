import { cacheExchange, createClient, fetchExchange } from "@urql/vue";
import type { AnyVariables, TypedDocumentNode } from "@urql/vue";

export const client = createClient({ url: "/graphql", exchanges: [cacheExchange, fetchExchange], requestPolicy: "network-only", preferGetMethod: false });

/** A GraphQL or network failure, with the server's `extensions.code` when there is one. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Run a typed query; throw ApiError for network and GraphQL errors (never a silent failure). */
export async function runQuery<TData, TVars extends AnyVariables>(doc: TypedDocumentNode<TData, TVars>, vars: TVars): Promise<TData> {
  const res = await client.query(doc, vars).toPromise();
  if (res.error) {
    const gql = res.error.graphQLErrors[0];
    if (gql) {
      const code = typeof gql.extensions["code"] === "string" ? gql.extensions["code"] : "UNKNOWN";
      throw new ApiError(gql.message, code);
    }
    throw new ApiError(res.error.networkError ? "Cannot reach the API. Is it running?" : res.error.message, "NETWORK_ERROR");
  }
  if (res.data === undefined) throw new ApiError("The API returned no data.", "NO_DATA");
  return res.data;
}
