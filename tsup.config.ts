import { defineConfig } from "tsup";

export default defineConfig({
  entry: { server: "src/server.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  noExternal: [/.*/],
  target: "node22",
});
