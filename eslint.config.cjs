import { FlatCompat } from "@eslint/eslintrc";
import { recommended } from "@eslint/js";
import prettierPlugin from "eslint-plugin-prettier";
import { __dirname } from "./utils";

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: recommended,
});

export default [
  {
    ignores: ["node_modules/**", "dist/**"],
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
      "no-undef": "error",
      "no-console": "off",
    },
  },
  ...compat.extends("eslint:recommended"),
  ...compat.extends("plugin:prettier/recommended"),
];
