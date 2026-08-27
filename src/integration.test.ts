import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import plugin, { recommended } from "./index.js";
import tseslint from "typescript-eslint";

/**
 * Run the plugin through ESLint the way it is actually used.
 *
 * RuleTester already covers the rule itself, so what this file checks is that the
 * config loads and that the rule survives TypeScript syntax. Nearly every consumer
 * is on TypeScript.
 */
async function lint(code: string, filePath: string): Promise<string[]> {
  const eslint = new ESLint({
    overrideConfig: [
      {
        files: ["**/*.ts"],
        languageOptions: { parser: tseslint.parser },
      },
      recommended,
    ],
    overrideConfigFile: true,
  });
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((message) => String(message.messageId));
}

describe("plugged into ESLint", () => {
  it("exposes the rule", () => {
    expect(Object.keys(plugin.rules)).toEqual(["no-hollow-test"]);
  });

  it("reports a body that checks nothing in a TypeScript test", async () => {
    const messages = await lint(
      `
        declare const save: (id: string) => Promise<void>;
        it("saves the record", async (): Promise<void> => {
          await save("1");
        });
      `,
      "example.test.ts",
    );
    expect(messages).toEqual(["noAssertion"]);
  });

  it("reports a body that only checks inside a branch", async () => {
    const messages = await lint(
      `
        it("checks when present", () => {
          const found: string | null = lookup();
          if (found !== null) {
            expect(found).toBe("1");
          }
        });
      `,
      "example.test.ts",
    );
    expect(messages).toEqual(["guardedOnly"]);
  });

  it("leaves a checking body alone", async () => {
    const messages = await lint(
      `
        it("checks the value", () => {
          expect(sum(1, 2)).toBe(3);
        });
      `,
      "example.test.ts",
    );
    expect(messages).toEqual([]);
  });
});
