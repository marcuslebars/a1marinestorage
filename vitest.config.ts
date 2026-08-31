import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // shared/ was omitted, so anything tested there silently never ran. The
    // quote model lives in shared/ precisely because the client panel and the
    // server-rendered PDF must agree, which makes it the code most worth testing.
    include: [
      "client/src/**/*.{test,spec}.ts",
      "server/**/*.{test,spec}.ts",
      "shared/**/*.{test,spec}.ts",
    ],
  },
  resolve: {
    alias: {
      "@": r("./client/src"),
      "@shared": r("./shared"),
    },
  },
});
