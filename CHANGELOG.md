# Changelog

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
