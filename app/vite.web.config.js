import { defineConfig } from "vite";
// Standalone web build. The SDK config intentionally adds an APP-only entry gate.
export default defineConfig({
  base: "./",
  assetsInclude: ["**/*.deflate"],
  optimizeDeps: { include: ["pdf-lib", "@heybox/hb-sdk"] },
});
