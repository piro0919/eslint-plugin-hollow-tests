# Changelog

## Unreleased

### Fixed

- **BREAKING (new reports):** a call to an asserting helper inside a branch no
  longer counts as a check that always runs. `if (found) expectSaved()` is now
  reported as `guardedOnly`, like `if (found) expect(...)`. The helper check used
  to run before the branch check and let it through.
- **BREAKING (new reports):** the body of a `for`, `for…in`, `for…of` or `while`
  loop counts as a branch. `for (const row of []) expect(row)…` runs nothing and
  is now reported. `do … while` runs at least once and is not. The right-hand side
  of `??` is treated as a branch too, like `&&` and `||`.
- `meta.version` comes from `package.json` at build time. It was hardcoded and
  would drift on the next release.

### Added

- `plugin.configs.recommended`, where ESLint's docs and most configs look for it.
  The named export `recommended` stays and is the same object.
- CI checks the packed package with `publint --strict` and `attw`
  (`pnpm check:package`), runs the tests on Node 22 and 24 and on ESLint 10, and
  checks the build loads on Node 18 and 20.

## 0.1.3

### Changed

- Repository layout now matches the other packages: tests live in `tests/`, biome
  runs on commit through lefthook, and `engines` is gone (it pinned nothing useful
  and made the host warn about automatic Node upgrades).

## 0.1.2

### Changed

- Ships both ESM and CJS builds with source maps, so a CommonJS `eslint.config.js`
  can `require()` the plugin.

## 0.1.1

### Changed

- Everything is written in English, including the messages the rule reports. The
  first release printed Japanese into every consumer's lint output.

## 0.1.0

Initial release.

### Added

- `no-hollow-test` — reports a test body with no assertion, and a test body whose
  assertions all sit inside a branch. Assertions moved into a helper are followed
  within the file, and hooks such as `test.beforeEach` are not treated as tests.
