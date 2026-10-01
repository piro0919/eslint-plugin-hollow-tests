import type { ESLint, Linter } from "eslint";
import { noHollowTest } from "./no-hollow-test";

/** Replaced with `package.json`'s version by tsup and vitest. */
declare const __PACKAGE_VERSION__: string;

const plugin = {
  configs: {} as { recommended: Linter.Config },
  meta: { name: "eslint-plugin-hollow-tests", version: __PACKAGE_VERSION__ },
  rules: { "no-hollow-test": noHollowTest },
} satisfies ESLint.Plugin;

/** Ready-made config. Apply it to test files only. */
export const recommended: Linter.Config = {
  plugins: { "hollow-tests": plugin },
  rules: { "hollow-tests/no-hollow-test": "error" },
};

// The usual place for it, `plugin.configs.recommended`. The named export stays
// for configs written against 0.1.
plugin.configs.recommended = recommended;

export { noHollowTest };
export default plugin;
