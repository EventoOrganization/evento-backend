const { FlatCompat } = require("@eslint/eslintrc");
const prettierPlugin = require("eslint-plugin-prettier");
const {
  configs: { recommended },
} = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: recommended,
});

module.exports = [
  {
    ignores: ["node_modules/**", "dist/**"],
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        node: true,
        es6: true,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
  ...compat.extends("eslint:recommended"),
  ...compat.extends("plugin:prettier/recommended"),
];
