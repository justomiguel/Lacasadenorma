# Catálogo inventario editorial Implementation Plan

> **For agentic workers:** Execute inline in this session. Work on `main` (constitución / `.cursor/rules/trabajo.mdc`). Do not open a branch or a pull request. Do not commit unless the user asks.

**Goal:** `/catalogo` deja de ser una tabla de siete columnas y pasa a un inventario editorial: foto, hecho, donar.

**Architecture:** `CatalogTable` se reemplaza por `CatalogInventory` (`<ul>` de filas). `CatalogScreen` agrega saltos in-page a las categorías. Mismos casos de uso. La ficha y `/admin/catalogo` no se tocan.

**Tech Stack:** Next.js App Router, Server Components, Tailwind tokens del `@theme`, Vitest, Playwright, copy en `content/{es,en}/catalogo.json`.

## Global Constraints

- Se trabaja sobre `main`, sin ramas ni PRs.
- `typescript` mayor 6, `eslint` mayor 9; no se tocan dependencias.
- Tokens de `@theme` solamente; se diseña a 390 px primero.
- Una primaria por pantalla; «Quiero donar» es `SecondaryAction`.
- HTML público idéntico con o sin sesión (ADR-037).
- Sin pictogramas inventados por categoría (ADR-047).
- Archivo de código ≤ 300 líneas (sin blancos ni comentarios).
- Copy: recortar, no inventar prosa de campaña.
- TDD: test en rojo antes de implementar.
- No commitear salvo pedido explícito.

## File map

- Create: `components/catalog/inventory.tsx`, `components/catalog/inventory.test.tsx`
- Delete: `components/catalog/table.tsx`, `components/catalog/table.test.tsx`
- Modify: `components/screens/catalog-screen.tsx`, `content/schemas/pages.ts`, `content/es/catalogo.json`, `content/en/catalogo.json`, `e2e/soporte/catalogo.ts`, `e2e/con-datos/catalogo.spec.ts`, `docs/adr/044-tabla-del-catalogo-y-quiero-donar.md`, `specs/002-cuentas-y-catalogo-de-donaciones/spec.md`, `specs/001-sitio-publico-campana/ux.md`, `docs/content-guide.md`

### Task 1: Inventario (TDD)

- [ ] Tests de `CatalogInventory` (ex `table.test.tsx`): no hay `table`; hay lista, foto, hecho, donar; no hay «¿La tomó alguien?» ni «—» de precio.
- [ ] Ver rojo.
- [ ] Implementar `inventory.tsx` + schema/copy (`listCaption`, `categoryJumpLabel`, lead corto).
- [ ] Ver verde.

### Task 2: Pantalla y e2e

- [ ] `CatalogScreen` usa inventario + nav de saltos (`<a href="#categoría">`, no `InlineLink` por `typedRoutes`).
- [ ] `filaDelCatalogo` busca `listitem`, no `row`.
- [ ] E2e del listado afirma inventario en 360 px, sin desborde.

### Task 3: Docs

- [ ] Enmendar ADR-044, FR-209, FR-214, ux.md, content-guide.md.
