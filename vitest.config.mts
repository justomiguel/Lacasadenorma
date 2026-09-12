import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Vite 8 resuelve los `paths` de tsconfig de forma nativa;
  // vite-tsconfig-paths es obsoleto.
  resolve: {
    tsconfigPaths: true,
    alias: {
      // El paquete real lanza si no lo reemplaza el bundler de Next. En tests
      // el cargador se importa desde `content/pack.ts`, que no lo usa.
      "server-only": new URL("./test/server-only-stub.ts", import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**", "supabase/**"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**", "components/**", "content/**"],
      exclude: [
        "**/*.test.*",
        "**/*.spec.*",
        "src/infrastructure/supabase/database.types.ts",
      ],
      thresholds: {
        // Umbrales por área: un porcentaje global alto con el dominio flojo
        // sería una mentira estadística (testing-strategy.md).
        "src/domain/**": { branches: 90, functions: 95, lines: 95, statements: 95 },
        "src/application/**": { branches: 75, functions: 85, lines: 85, statements: 85 },
      },
    },
  },
});
