import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  // graphql-js is a dual package (CJS + ESM). Apollo loads the CJS build, so the code under test
  // must load the same one, otherwise: "Cannot use GraphQLSchema from another module or realm".
  resolve: { alias: [{ find: /^graphql$/, replacement: require.resolve("graphql") }] },
  test: { include: ["test/**/*.test.ts"], testTimeout: 60_000, pool: "forks" },
});
