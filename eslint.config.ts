import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";

/**
 * La regla de dependencias entre capas (ADR-005) se impone acá y no por
 * convención: sin linter, la frontera se degrada en semanas.
 */
export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    ".specify/**",
    ".agents/**",
    "supabase/**",
    // Generado por `npm run db:types` desde el esquema real. Corregirlo a mano
    // se perdería en la próxima generación.
    "src/infrastructure/supabase/database.types.ts",
  ]),

  ...nextVitals,
  ...nextTs,

  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Next exige `async` en funciones que no hacen await: Server Actions,
      // generateStaticParams y headers() en next.config.ts.
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-explicit-any": "error",
      // Principio XII: ningún fallo silencioso.
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },

  // domain/ es TypeScript puro: sin React, sin Next, sin I/O.
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-dom",
                "next",
                "next/*",
                "@supabase/*",
                "@/app/*",
                "@/components/*",
                "@/src/infrastructure/*",
                "@/src/application/*",
              ],
              message:
                "domain/ no puede depender de UI, framework ni infraestructura (ADR-005).",
            },
          ],
        },
      ],
    },
  },

  // application/ depende de puertos, nunca de implementaciones concretas.
  {
    files: ["src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/src/infrastructure/*", "@/app/*", "@/components/*"],
              message:
                "application/ depende de puertos de domain, no de infrastructure ni de UI (ADR-005).",
            },
          ],
        },
      ],
    },
  },

  // La presentación no habla con la base de datos: llama casos de uso.
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/src/infrastructure/supabase/*"],
              message:
                "Los componentes no acceden a la base de datos: usan casos de uso (ADR-005).",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["**/*.{test,spec}.{ts,tsx}", "e2e/**/*.ts", "scripts/**/*.mjs"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "no-console": "off",
    },
  },

  prettier,
]);
