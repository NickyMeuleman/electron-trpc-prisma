module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [
      "api/tsconfig.json",
      "main/tsconfig.json",
      "preload/tsconfig.json",
      "renderer/tsconfig.json",
      "scripts/tsconfig.json",
      "./tsconfig.node.json",
      "./tsconfig.json",
    ],
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended", // disable core eslint rules that conflict with replacement @typescript-eslint rules
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:@typescript-eslint/strict",
    "prettier", // config-prettier disables eslint rules that conflict with prettier
  ],
  rules: {},
};
