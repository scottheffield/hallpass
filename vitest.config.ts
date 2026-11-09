import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Worker-only module. The stub makes tracing a no-op in tests.
    alias: { "cloudflare:workers": fileURLToPath(new URL("./worker/lib/cloudflare-workers.stub.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["worker/**/*.test.ts", "src/**/*.test.ts", "shared/**/*.test.ts"],
  },
});
