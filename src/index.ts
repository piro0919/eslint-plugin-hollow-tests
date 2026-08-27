import { noHollowTest } from "./no-hollow-test.js";
import type { ESLint, Linter } from "eslint";

const plugin = {
  meta: { name: "eslint-plugin-hollow-tests", version: "0.1.0" },
  rules: { "no-hollow-test": noHollowTest },
} satisfies ESLint.Plugin;

/** そのまま並べれば効く設定。テストファイルにだけ当てること。 */
export const recommended: Linter.Config = {
  plugins: { "hollow-tests": plugin },
  rules: { "hollow-tests/no-hollow-test": "error" },
};

export { noHollowTest };
export default plugin;
