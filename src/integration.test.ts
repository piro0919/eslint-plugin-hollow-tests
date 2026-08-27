import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import plugin, { recommended } from "./index.js";
import tseslint from "typescript-eslint";

/**
 * 実際の使い方どおりに ESLint へ差し込んで通す。
 *
 * 規則そのものは RuleTester で見ているので、ここで見るのは「設定として読み込めるか」
 * と「TypeScript の構文でも動くか」。利用者はほぼ TypeScript で使う。
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

describe("ESLint に差し込む", () => {
  it("規則を公開している", () => {
    expect(Object.keys(plugin.rules)).toEqual(["no-hollow-test"]);
  });

  it("TypeScript のテストで、確かめていない本体を拾う", async () => {
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

  it("TypeScript のテストで、分岐の内側だけの本体を拾う", async () => {
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

  it("確かめている本体は通す", async () => {
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
