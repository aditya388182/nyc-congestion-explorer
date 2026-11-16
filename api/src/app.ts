import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ApolloServer } from "@apollo/server";
import type { ApolloServerPlugin, GraphQLRequestListener } from "@apollo/server";
import { GraphQLError, buildASTSchema, parse } from "graphql";
import type { GraphQLFormattedError } from "graphql";
import type { Logger } from "pino";
import type { Context } from "./context.js";
import { EstimateService } from "./estimator/estimate.js";
import { createLoaders } from "./loaders/loaders.js";
import { assertComplexity, operationComplexity } from "./limits/complexity.js";
import { depthLimit } from "./limits/depth.js";
import { logger as defaultLogger } from "./logger.js";
import { resolvers } from "./resolvers/index.js";
import { loadData } from "./store/dataStore.js";
import type { DataStore } from "./store/dataStore.js";

function readSchemaSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const rel of ["schema.graphql", "src/schema.graphql", "../src/schema.graphql"]) {
    try {
      return readFileSync(join(here, rel), "utf8");
    } catch {
      /* try next */
    }
  }
  throw new Error("schema.graphql not found");
}

export interface App {
  server: ApolloServer<Context>;
  services: { data: DataStore; estimates: EstimateService; logger: Logger };
  context: () => Promise<Context>;
}

/** Never leak a stack trace or an internal message: unexpected errors become a generic one. */
export function formatError(formatted: GraphQLFormattedError, error?: unknown, logger?: Logger): GraphQLFormattedError {
  const code = formatted.extensions?.["code"];
  if ((code === "INTERNAL_SERVER_ERROR" || code === undefined) && logger) {
    // the cause stays in the server log; the client only gets the generic message
    const cause = (error as { originalError?: Error } | undefined)?.originalError ?? (error as Error | undefined);
    logger.error({ msg: "internal error", error: cause?.message, stack: cause?.stack });
  }
  const extensions = { ...(formatted.extensions ?? {}) } as Record<string, unknown>;
  delete extensions["stacktrace"];
  if (code === "INTERNAL_SERVER_ERROR" || code === undefined) {
    return { message: "Internal server error", extensions: { code: "INTERNAL_SERVER_ERROR" } };
  }
  if (typeof extensions["depth"] === "number") extensions["code"] = "QUERY_TOO_DEEP"; // Apollo labels rule errors as validation failures
  return { ...formatted, extensions };
}

export function createApp(data: DataStore = loadData(), logger: Logger = defaultLogger): App {
  const typeDefs = readSchemaSource();
  const schema = buildASTSchema(parse(typeDefs));
  const complexityPlugin: ApolloServerPlugin<Context> = {
    requestDidStart(): Promise<GraphQLRequestListener<Context>> {
      return Promise.resolve({
        didResolveOperation({ document, request }) {
          const cost = operationComplexity(schema, document, request.variables ?? {}, request.operationName);
          assertComplexity(cost);
          return Promise.resolve();
        },
      });
    },
  };
  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    introspection: process.env["NODE_ENV"] !== "production",
    validationRules: [depthLimit()],
    plugins: [complexityPlugin],
    includeStacktraceInErrorResponses: false,
    formatError: (f, e) => formatError(f, e, logger),
  });
  const services = { data, estimates: new EstimateService(data), logger };
  return {
    server,
    services,
    context: () => Promise.resolve({ ...services, loaders: createLoaders(data.panel) }),
  };
}

export { GraphQLError };
