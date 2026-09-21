# Aceptar antes de entregar — Implementation Plan

> **For agentic workers:** Execute inline in this session. Work on `main`. TDD. One logical commit at the end.

**Goal:** Partir «Sí: donan» y «Llegó» con el estado `accepted`, sin decir que llegó hasta que el admin lo confirme.

**Architecture:** Un valor nuevo en `pledge_status`, `accepted_at`, `accept_donation_pledge`, y `fulfill` sólo desde `accepted`. `reserved_quantity` suma reserved + accepted. El copy de `/catalogo` no cambia.

**Tech Stack:** Postgres (enum + security definer), dominio TypeScript, Next.js admin/cuenta, vitest + pgTAP.

## Global Constraints

- Se trabaja sobre `main`. Sin ramas ni PRs.
- `accepted` en código, no `taken`.
- No se salta `reserved → fulfilled`.
- `reserved_quantity` incluye `accepted`.
- Al aceptar no se manda correo.
- `typescript` mayor 6, `eslint` mayor 9. Dependencias exactas.
- Icono antes del nombre en cada botón con caja (`check:iconos`).
- `security definer` con `search_path = ''`. Sin `for all`. Sin policy a `authenticated` sin rol o dueño.

---

### Task 1: Dominio

**Files:** `src/domain/pledge-status.ts`, `src/domain/pledge-status.test.ts`, `src/domain/entities/donation-pledge.ts`, `src/domain/entities/audit.ts`

- [ ] Tests en rojo: accept, no-skip, cancel desde accepted, activas y visibles.
- [ ] Implementar máquina y helpers.
- [ ] `pledge.accepted` en auditoría.

### Task 2: Aplicación

**Files:** `src/application/admin/pledges.ts`, `pledges.test.ts`, `index.ts`, `fake-admin-gateway.ts`, `src/domain/ports/donations.ts`

- [ ] `acceptPledge` con nombre/nota. `fulfillPledge` sin ellos.
- [ ] Tests en rojo y verde.

### Task 3: Postgres

**Files:** migración nueva vía `supabase migration new`, `supabase/tests/070-catalogo.sql`

- [ ] Enum, `accepted_at`, funciones, trigger, tope de 5.
- [ ] pgTAP: aceptar no mueve; cumplir sí; donante no suelta accepted.

### Task 4: UI, correos, docs

**Files:** admin donaciones + decidir, own-pledges, cuenta.json, emails.json, data-model, spec FR-260, correos, ADR-033, database.types.ts

- [ ] En curso = reserved + accepted. Entregada, no Donado.
- [ ] `/cuenta`: pendiente de entrega.
- [ ] Correos del equipo sin «donado hoy» ni llegada en el sí.
