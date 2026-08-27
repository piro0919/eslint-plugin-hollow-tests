import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import { noHollowTest } from "./no-hollow-test.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

// RuleTester は自前の it/describe を探すので、vitest のものを渡す。
RuleTester.describe = describe as never;
RuleTester.it = it as never;
RuleTester.itOnly = it.only as never;

ruleTester.run("no-hollow-test", noHollowTest, {
  invalid: [
    {
      code: `it("saves the record", () => { save(); });`,
      errors: [{ messageId: "noAssertion" }],
    },
    {
      // 実際に積み上がっていた形。条件が外れると1つも実行せずに通る。
      code: `
        it("uses the button when present", () => {
          const hasButton = getButton() !== null;
          if (hasButton) {
            expect(getButton()).toBeVisible();
          }
        });
      `,
      errors: [{ messageId: "guardedOnly" }],
    },
    {
      code: `
        test("logs in", async () => {
          await login();
          if (isAdmin) expect(page.url()).toContain("/admin");
          else expect(page.url()).toContain("/home");
        });
      `,
      errors: [{ messageId: "guardedOnly" }],
    },
    {
      code: `
        it("checks lazily", () => {
          found && expect(found.id).toBe("1");
        });
      `,
      errors: [{ messageId: "guardedOnly" }],
    },
    {
      code: `
        it("swallows the failure", () => {
          try {
            risky();
          } catch {
            expect(true).toBe(false);
          }
        });
      `,
      errors: [{ messageId: "guardedOnly" }],
    },
    {
      code: `it.skip("does nothing", () => { noop(); });`,
      errors: [{ messageId: "noAssertion" }],
    },
    {
      code: `it.each([1, 2])("does nothing with %i", (n) => { use(n); });`,
      errors: [{ messageId: "noAssertion" }],
    },
    {
      // ヘルパーを呼んでいても、そのヘルパーが確かめていなければ見逃さない。
      code: `
        function saveRecord() { return submit(); }
        it("saves", () => { saveRecord(); });
      `,
      errors: [{ messageId: "noAssertion" }],
    },
    {
      // 名前を差し替えたら、既定の expect はアサーションとして数えない。
      code: `it("uses expect after renaming", () => { expect(1).toBe(1); });`,
      errors: [{ messageId: "noAssertion" }],
      options: [{ assertionNames: ["check"] }],
    },
  ],
  valid: [
    `it("checks the value", () => { expect(sum(1, 2)).toBe(3); });`,
    `test("checks the value", () => { expect(sum(1, 2)).toBe(3); });`,
    // 判定をヘルパーへ寄せた書き方は壊さない。
    `
      function expectSaved(id) { expect(store.get(id)).toBeDefined(); }
      it("saves", () => { save("1"); expectSaved("1"); });
    `,
    `
      const expectSaved = (id) => { expect(store.get(id)).toBeDefined(); };
      it("saves", () => { expectSaved("1"); });
    `,
    // 分岐の内側にもあるが、外にもある。
    `
      it("checks both ways", () => {
        expect(page.url()).toBeTruthy();
        if (isAdmin) expect(page.url()).toContain("/admin");
      });
    `,
    // if の条件式そのものは必ず評価される。
    `it("checks in the condition", () => { if (expect(a).toBe(1)) { run(); } });`,
    `it("has no body to inspect", "not a function");`,
    // フックはテスト本体ではない。ここを拾うと大量に誤検知する。
    `test.beforeEach(() => { reset(); });`,
    `beforeEach(() => { reset(); });`,
    `describe("group", () => { it("checks", () => { expect(1).toBe(1); }); });`,
    // 見逃しは作者が理由を添えて宣言する。
    `
      // hollow-test-ok 例外が飛ばないことだけを確かめている
      it("does not throw", () => { render(); });
    `,
    `it("does not throw", () => { /* hollow-test-ok 投げないことだけ見る */ render(); });`,
    {
      code: `it("checks with a custom name", () => { check(1); });`,
      options: [{ assertionNames: ["check"] }],
    },
    {
      code: `spec("checks", () => { expect(1).toBe(1); });`,
      options: [{ testNames: ["spec"] }],
    },
    // 既定の名前では拾わないので、設定を変えないかぎり無視する。
    `spec("does nothing", () => { noop(); });`,
    `it("asserts with assert", () => { assert.equal(1, 1); });`,
  ],
});
