// tsdown.config.ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/**/*.ts"],
  bundle: false,
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
});