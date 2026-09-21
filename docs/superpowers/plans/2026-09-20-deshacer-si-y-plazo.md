# Deshacer el sí y plazo sin automático Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans in this session. Se trabaja sobre `main` (constitución). Sin ramas ni pull requests.

**Goal:** El admin puede soltar una reserva ya marcada «Sí: donan». A los 14 días el equipo recibe un mail; el ítem no se suelta solo.

**Architecture:** Una transición nueva (`fulfilled` → `cancelled`) en dominio y en `cancel_donation_pledge`. `release_expired_holds` deja de invocarse. El cron de `remind-pledges.mjs` manda `staff.pledge_expired` con los dos enlaces de decidir.

**Tech Stack:** TypeScript, Postgres (`security definer` + `search_path = ''`), Vitest, pgTAP, Next.js App Router.

## Global Constraints

- Se trabaja sobre `main`. Un commit lógico al terminar.
- Tests primero en dominio, policies y funciones.
- `typescript` mayor 6, `eslint` mayor 9. Archivos de código ≤ 300 líneas.
- Copy del backoffice en castellano. Los dos `emails.json` idénticos en staff.
- Nada automático cancela ni devuelve unidades.

### Task 1: Dominio

**Files:**
- Modify: `src/domain/pledge-status.ts`
- Modify: `src/domain/entities/donation-pledge.ts`
- Test: `src/domain/pledge-status.test.ts`

**Produces:** `nextPledgeStatus('fulfilled', 'cancel')` → `'cancelled'`. `canStaffReleasePledge`. `isPledgePastHold`.

- [ ] Test rojo: fulfilled+cancel; cancelled no admite cancel; `canStaffReleasePledge` true en reserved/fulfilled; `isPledgePastHold` si `expires_at` ya pasó.
- [ ] Implementar.
- [ ] Verde.

### Task 2: Correo y métricas

**Files:**
- Modify: `content/es/emails.json`, `content/en/emails.json`, `content/schemas/emails.ts`
- Test: `src/application/emails/messages.test.ts`
- Modify: `src/domain/metrics-signals.ts`
- Test: `src/domain/metrics-signals.test.ts`

- [ ] Test rojo: `staff.pledge_expired` pide sí/no y no dice que el ítem volvió. `pledges_expired` no se emite.
- [ ] Copy + schema `rejectAction`. Quitar la señal `pledges_expired`.
- [ ] Verde.

### Task 3: Base

**Files:**
- Create: `supabase/migrations/20260920213000_release_fulfilled_and_stop_auto_expire.sql`
- Modify: `supabase/tests/070-catalogo.sql`

- [ ] pgTAP rojo conceptual: admin suelta fulfilled; donante no; claim no libera vencidas.
- [ ] Migración: `cancel_donation_pledge` acepta fulfilled (sólo admin+); claim/offer sin `release_expired_holds`; unschedule cron.
- [ ] `db:verify` en verde para esos casos.

### Task 4: Pantalla

**Files:**
- Modify: `app/(es)/admin/(panel)/donaciones/page.tsx`
- Modify: `app/(es)/admin/(panel)/donaciones/decidir/[id]/[decision]/page.tsx`

- [ ] Donado muestra soltar. En curso con plazo pasado dice «Pasaron 14 días». Decidir con ya Donado muestra soltar.

### Task 5: Cron y docs

**Files:**
- Modify: `scripts/remind-pledges.mjs`
- Modify: spec FR-217/218/221/222, `data-model.md`, contrato de correos, ADR-033, `docs/runbook.md`

- [ ] Query de reserved con `expires_at <= now()` sin delivery `staff.pledge_expired`. Mail a `EMAIL_STAFF_ADDRESS` con sí/no.
- [ ] Enmendar docs.
