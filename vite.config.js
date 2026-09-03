import { defineConfig } from "vite";

export default defineConfig({
  appType: "spa",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    sourcemap: true,
  },
});
