# ADR-001 · Next.js 16 con App Router, y versiones fijadas por compatibilidad real

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

El sitio tiene dos requisitos que empujan en la misma dirección: el contenido crítico debe llegar
como HTML servido para que sea legible en 4G en menos de 2,5 s (SC-004), y debe ser indexable y
citable sin depender de JavaScript (FR-025). Además tiene que crecer hacia una plataforma con
backoffice autenticado, sin cambiar de tecnología en el camino.

Un dato del entorno que condicionó todo: las versiones `latest` de `typescript` (7.0.2) y `eslint`
(10.10.0) **rompen el ecosistema hoy**, lo que se comprobó instalándolas y ejecutándolas.

## Decisión

Next.js 16.3.4 con App Router, React 19.3.0, y Server Components por defecto. `"use client"`
requiere justificación por interactividad real.

Versiones fijadas: TypeScript **6.0.3** (última con API de compilador en JS, requisito de
`typescript-eslint`), ESLint **9.39.5**, Tailwind 4.3.3, Vitest 5, Playwright 1.63.

El binario `tsc` de TypeScript 7.0.2 se usa por alias (`tsgo`) sólo para acelerar el typecheck,
invocado por ruta explícita para no depender de cómo npm resuelva un conflicto de binarios.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Astro | Excelente para contenido, pero el backoffice autenticado y el crecimiento hacia una plataforma quedarían fuera de su zona cómoda |
| Remix / React Router | Válido, pero sin ventaja sobre Next para este caso, y con menos integración con el hosting elegido |
| SvelteKit | Ganaría algo de bundle; perdería el ecosistema en el que el resto de las decisiones (Supabase SSR, testing) está mejor soportado |
| HTML estático generado a mano | Cubriría las páginas públicas y no el backoffice; habría que migrar todo después |
| `typescript@7` como módulo principal | `typescript-eslint` aborta: TS 7 no expone la API de compilador en JS |
| `eslint@10` | Rompe `eslint-plugin-react`, `eslint-plugin-import` y `jsx-a11y`, que `eslint-config-next` arrastra |

## Consecuencias

**Buenas.** Casi nada de JavaScript en las páginas públicas. Metadata, sitemap y OpenGraph son
primera clase. El backoffice comparte el mismo proyecto y la misma capa de aplicación.

**Malas y aceptadas.**

- Next 16 tiene rupturas importantes respecto de lo que la mayoría del material publicado asume:
  `params` es una Promise, `middleware.ts` pasa a `proxy.ts`, `next lint` desapareció, y
  `PageProps`/`LayoutProps` son globales generados que exigen correr `next typegen` **antes** de
  `tsc` y de `eslint`. Está documentado en `docs/research/2026-09-toolchain.md`.
- `next build` typechequea también los archivos de test, así que un error en un test rompe el build
  de producción. Es incómodo y es correcto.
- Quedamos atados a la cadencia de rupturas de Next. Se mitiga con las cuatro capas: `domain/` y
  `application/` no importan nada de Next, así que una migración futura toca `app/` y
  `components/`, no el núcleo.
- ESLint 9 aparece marcado como deprecado por npm. Es cosmético; no hay alternativa compatible.
