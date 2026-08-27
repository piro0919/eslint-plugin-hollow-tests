import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import { noHollowTest } from "../src/no-hollow-test";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

// RuleTester looks for its own it/describe, so hand it vitest's.
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
      // A shape found in a real suite. Nothing runs when the condition is false.
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
      // Calling a helper is not enough when the helper asserts nothing.
      code: `
        function saveRecord() { return submit(); }
        it("saves", () => { saveRecord(); });
      `,
      errors: [{ messageId: "noAssertion" }],
    },
    {
      // Renaming the assertion stops `expect` from counting as one.
      code: `it("uses expect after renaming", () => { expect(1).toBe(1); });`,
      errors: [{ messageId: "noAssertion" }],
      options: [{ assertionNames: ["check"] }],
    },
  ],
  valid: [
    `it("checks the value", () => { expect(sum(1, 2)).toBe(3); });`,
    `test("checks the value", () => { expect(sum(1, 2)).toBe(3); });`,
    // Assertions moved into a helper still count.
    `
      function expectSaved(id) { expect(store.get(id)).toBeDefined(); }
      it("saves", () => { save("1"); expectSaved("1"); });
    `,
    `
      const expectSaved = (id) => { expect(store.get(id)).toBeDefined(); };
      it("saves", () => { expectSaved("1"); });
    `,
    // Some assertions are inside a branch, but one is outside.
    `
      it("checks both ways", () => {
        expect(page.url()).toBeTruthy();
        if (isAdmin) expect(page.url()).toContain("/admin");
      });
    `,
    // The test of an `if` always evaluates.
    `it("checks in the condition", () => { if (expect(a).toBe(1)) { run(); } });`,
    `it("has no body to inspect", "not a function");`,
    // Hooks are not test bodies. Catching them would produce a flood of false reports.
    `test.beforeEach(() => { reset(); });`,
    `beforeEach(() => { reset(); });`,
    `describe("group", () => { it("checks", () => { expect(1).toBe(1); }); });`,
    // Skipping is declared by the author, with a reason.
    `
      // hollow-test-ok only checks that rendering does not throw
      it("does not throw", () => { render(); });
    `,
    `it("does not throw", () => { /* hollow-test-ok only checks it does not throw */ render(); });`,
    {
      code: `it("checks with a custom name", () => { check(1); });`,
      options: [{ assertionNames: ["check"] }],
    },
    {
      code: `spec("checks", () => { expect(1).toBe(1); });`,
      options: [{ testNames: ["spec"] }],
    },
    // Not matched by the default names, so it is ignored until configured.
    `spec("does nothing", () => { noop(); });`,
    `it("asserts with assert", () => { assert.equal(1, 1); });`,
  ],
});
