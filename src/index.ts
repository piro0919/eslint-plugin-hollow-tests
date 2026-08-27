import type { ESLint, Linter } from "eslint";
import { noHollowTest } from "./no-hollow-test";

const plugin = {
  meta: { name: "eslint-plugin-hollow-tests", version: "0.1.3" },
  rules: { "no-hollow-test": noHollowTest },
} satisfies ESLint.Plugin;

/** Ready-made config. Apply it to test files only. */
export const recommended: Linter.Config = {
  plugins: { "hollow-tests": plugin },
  rules: { "hollow-tests/no-hollow-test": "error" },
};

export { noHollowTest };
export default plugin;
