# eslint-plugin-hollow-tests

Catches tests that pass without checking anything.

```js
// ❌ no assertion at all
it("saves the record", async () => {
  await save(record);
});

// ❌ assertions only inside a branch — nothing runs when the condition is false
it("uses the button when present", () => {
  if (hasButton) {
    expect(getButton()).toBeVisible();
  }
});
```

Both pass type checking and linting, and both raise the test count, so the code
looks covered. Neither is something a reader reliably notices.

## How this differs from `expect-expect`

`vitest/expect-expect` and `jest/expect-expect` check whether a test body contains
a call to an assertion function. This rule goes two steps further.

| | expect-expect | hollow-tests |
| ---- | ---- | ---- |
| Body with no assertion | reported | reported |
| Assertions only inside a branch | missed | **reported** |
| Assertions moved into a helper | needs the helper listed in config | **followed automatically within the file** |

"Inside a branch" covers `if`, the conditional operator, the right-hand side of
`&&` and `||`, a `switch` case, and `catch`. The test of an `if` always evaluates,
so it counts as outside.

## Install

```bash
npm install -D eslint-plugin-hollow-tests
```

```js
// eslint.config.js
import hollowTests from "eslint-plugin-hollow-tests";

export default [
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "e2e/**/*.ts"],
    plugins: { "hollow-tests": hollowTests },
    rules: { "hollow-tests/no-hollow-test": "error" },
  },
];
```

A ready-made config is also exported. Apply it to test files only.

```js
import { recommended } from "eslint-plugin-hollow-tests";

export default [{ ...recommended, files: ["**/*.test.ts"] }];
```

## Options

```js
"hollow-tests/no-hollow-test": ["error", {
  assertionNames: ["expect", "assert"],
  testNames: ["it", "test"],
  optOutComment: "hollow-test-ok",
}]
```

| Option | Default | Meaning |
| ---- | ---- | ---- |
| `assertionNames` | `["expect", "assert"]` | Calls that count as assertions. Member forms such as `assert.equal(...)` count too |
| `testNames` | `["it", "test"]` | Calls that introduce a test body. Modifiers (`.skip`, `.each`, …) are matched automatically |
| `optOutComment` | `"hollow-test-ok"` | A test carrying a comment with this text is left alone |

## Opting out

When there is a reason not to assert, write the reason next to it.

```js
// hollow-test-ok only checks that rendering does not throw
it("does not throw", () => {
  render(<App />);
});
```

## What it does not report

- Hooks. A call shaped like `test.beforeEach` is not treated as a test body. The
  modifiers are listed explicitly rather than matched with `.*`
- Expression bodies. `() => expect(a).toBe(1)` always runs
- Helpers from another file. Assertions are followed within a single file only.
  For a shared helper, add its name to `assertionNames`

## License

MIT
