import { readFileSync } from "node:fs";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";
import plugin, { recommended } from "../src/index";

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

  it("exposes the recommended config on the plugin and as a named export", () => {
    expect(plugin.configs.recommended).toBe(recommended);
    expect(plugin.configs.recommended.rules).toEqual({
      "hollow-tests/no-hollow-test": "error",
    });
  });

  it("reports the version in package.json", () => {
    const { version } = JSON.parse(readFileSync("package.json", "utf8")) as {
      version: string;
    };
    expect(plugin.meta.version).toBe(version);
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
