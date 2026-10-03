import { miniappManifest } from "@heybox/hb-sdk/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  assetsInclude: ["**/*.deflate"],
  optimizeDeps: { include: ["pdf-lib", "@heybox/hb-sdk"] },
  plugins: [miniappManifest()],
});
