import js from "@eslint/js";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/cdk.out/**", "web/src/graphql/generated/**", "api/src/generated/**", "web/public/**", "**/playwright-report/**", "**/test-results/**", "study/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...vue.configs["flat/essential"],
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["*.js", "*.mjs", "infra/*.mts", "web/scripts/*.mjs"] },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".vue"],
      },
    },
    rules: {
      "no-undef": "off", // TypeScript checks undefined names (and knows DOM/Node globals)
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    // vue-tsc type-checks the .vue files; typescript-eslint's type-aware rules cannot see inside them
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    // generated GraphQL documents and typed JSON blobs
    files: ["web/src/stores/*.ts"],
    rules: { "@typescript-eslint/no-unnecessary-type-assertion": "off" },
  },
  { files: ["**/*.js", "**/*.mjs"], ...tseslint.configs.disableTypeChecked },
);
