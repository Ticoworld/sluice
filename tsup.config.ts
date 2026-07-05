import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    package: "src/package.ts",
    "sdk/index": "src/sdk/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  platform: "node",
  target: "es2022",
  splitting: false,
  sourcemap: false,
  minify: false,
  outDir: "dist",
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
});
