import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const API = "http://127.0.0.1:4000";

export default defineConfig({
  plugins: [vue()],
  server: { host: "127.0.0.1", port: 5173, proxy: { "/graphql": API } },
  preview: { host: "127.0.0.1", port: 4173, proxy: { "/graphql": API } },
  build: { chunkSizeWarningLimit: 1500 },
  test: { environment: "jsdom", include: ["src/**/*.test.ts"], globals: false },
});
