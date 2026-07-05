import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["client/src/**/*.{test,spec}.ts", "server/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: {
      "@": r("./client/src"),
      "@shared": r("./shared"),
    },
  },
});
