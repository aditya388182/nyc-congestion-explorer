import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../api/src/schema.graphql",
  documents: ["src/graphql/*.graphql"],
  generates: {
    "src/graphql/generated/": {
      preset: "client",
      presetConfig: { fragmentMasking: false },
      config: { scalars: { JSON: "unknown" }, enumsAsTypes: true, strictScalars: true },
    },
  },
};
export default config;
