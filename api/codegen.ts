import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "src/schema.graphql",
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        enumsAsTypes: true,
        scalars: { JSON: "unknown" },
        contextType: "../context#Context",
        strictScalars: true,
        mappers: { Zone: "../store/dataStore#ZoneRecord" },
      },
    },
  },
};
export default config;
