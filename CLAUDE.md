# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**eslint-plugin-hollow-tests** reports tests that pass without checking anything.
Its differentiator over `expect-expect`: it also catches a body whose assertions all
sit inside a branch, and it follows assertions moved into a helper within the file.

- **npm package:** eslint-plugin-hollow-tests
- **Demo site:** <https://eslint-plugin-hollow-tests.kkweb.io>

## Tech Stack

- TypeScript 5, no runtime dependencies (`eslint` is a peer)
- Next.js 16 (App Router) — demo site only
- Biome (linter/formatter)
- tsup (library build, ESM + CJS)
- Vitest + ESLint `RuleTester` — tests
- Vercel (deployment)

## Project Structure

```text
src/
├── index.ts            # plugin entry point and the `recommended` config
├── no-hollow-test.ts   # the rule
└── app/                # Next.js App Router (demo site)
    └── api/lint/       # runs the rule on a snippet for the playground
tests/                  # RuleTester cases and an end-to-end ESLint run
assets/                 # Sora subset drawn into the Open Graph card
```

## Commands

```bash
pnpm dev         # demo site
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
pnpm lint        # biome check
pnpm build:lib   # tsup -> dist
pnpm build       # next build (demo site)
```

## Rule design notes

- **Test modifiers are listed explicitly** (`only`, `skip`, `each`, …). A `.*`
  pattern would match `test.beforeEach` and count hooks as test bodies, which
  produces a flood of false reports.
- **The test of an `if` always evaluates**, so an assertion there counts as outside
  the branch. "Inside a branch" covers `if`, the conditional operator, the
  right-hand side of `&&`/`||`, a `switch` case, and `catch`.
- **Helper following is per-file only.** Cross-file helpers need their names added
  to `assertionNames`.
- Opting out is the author's declaration: a comment containing `hollow-test-ok`.

## Testing

`tests/no-hollow-test.test.ts` uses ESLint's `RuleTester`; `tests/integration.test.ts`
runs the plugin through a real `ESLint` instance with the TypeScript parser, which is
how nearly every consumer uses it.

When changing the rule, break it deliberately and confirm the tests fail before
restoring. Assertions that never bite are worse than no tests.

## Releasing

Bump `version` in `package.json` **and in `src/index.ts`'s `meta`**, add a
`CHANGELOG.md` entry, then push a `vX.Y.Z` tag.
