import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["eslint"],
  // `meta.version` follows package.json instead of being bumped by hand.
  define: { __PACKAGE_VERSION__: JSON.stringify(version) },
  tsconfig: "tsconfig.build.json",
});
