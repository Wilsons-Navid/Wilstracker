import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests run in plain Node. Two aliases make the app's server modules
// importable here: `@/*` mirrors the tsconfig path, and `server-only` is
// stubbed so importing a server module doesn't throw outside a React Server
// Component context.
export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
