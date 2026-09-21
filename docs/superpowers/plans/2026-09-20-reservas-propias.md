# Reservas propias — foto y estado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mis donaciones lista sólo reservas anotadas y llegadas, cada una con la foto del tipo y los dos estados (tu reserva y el ítem).

**Architecture:** `isVisibleOwnPledge` filtra en la pantalla. `AccountScreen` pide `getCatalog` junto a `getOwnAccount` y junta por `itemId`. Sin puerto ni RLS nuevos.

**Tech Stack:** Next.js App Router, React Testing Library, Vitest, Playwright.

## Global Constraints

- Se trabaja sobre `main`. No hay ramas ni pull requests.
- Tests primero; el rojo tiene que ser por la feature que falta.
- Copy reusada: `pledgeExpires` / `pledgeFulfilled` / `pledgeQuantity` y `remainingFact` / `covered`.
- Sin foto no se reserva hueco. Canceladas y vencidas no se listan.
- `typescript` mayor 6, `eslint` mayor 9. Archivos de código ≤ 300 líneas.

### Task 1: `isVisibleOwnPledge`

**Files:**
- Modify: `src/domain/entities/donation-pledge.ts`
- Test: `src/domain/pledge-status.test.ts`

**Interfaces:**
- Consumes: `DonationPledge["status"]`
- Produces: `isVisibleOwnPledge(pledge: Pick<DonationPledge, "status">): boolean`

- [ ] **Step 1: Write the failing test**

Add after `isActivePledge` in `src/domain/pledge-status.test.ts`:

```ts
import { isActivePledge, isVisibleOwnPledge } from "./entities/donation-pledge";

describe("isVisibleOwnPledge", () => {
  it("reserved y fulfilled se listan; cancelled y expired no", () => {
    expect(isVisibleOwnPledge({ status: "reserved" })).toBe(true);
    expect(isVisibleOwnPledge({ status: "fulfilled" })).toBe(true);
    expect(isVisibleOwnPledge({ status: "cancelled" })).toBe(false);
    expect(isVisibleOwnPledge({ status: "expired" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pledge-status.test.ts`

Expected: FAIL — `isVisibleOwnPledge` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/domain/entities/donation-pledge.ts`, next to `isActivePledge`:

```ts
export function isVisibleOwnPledge(
  pledge: Pick<DonationPledge, "status">,
): boolean {
  return pledge.status === "reserved" || pledge.status === "fulfilled";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pledge-status.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** — only if the owner asked. Otherwise leave unstaged.

### Task 2: `OwnPledges` inventory row

**Files:**
- Create: `components/account/own-pledges.test.tsx`
- Modify: `components/account/own-pledges.tsx`
- Modify: `components/account/account-panels.tsx` (pass `items`)

**Interfaces:**
- Consumes: `isVisibleOwnPledge`, `catalogItemPhotograph`, `isCovered`, `unitLabel`, `getContent`
- Produces: `OwnPledges({ pledges, items, copy, catalog, locale })`

- [ ] **Step 1: Write the failing tests**

`components/account/own-pledges.test.tsx` covers: reserved with photo + item fact + cancel; fulfilled without cancel; cancelled/expired hidden; unpublished item keeps reference photo by title and omits item fact; no photo hole; filtered-empty shows `pledgesEmpty`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/account/own-pledges.test.tsx`

Expected: FAIL — missing `items` prop and new markup.

- [ ] **Step 3: Implement the row**

Filter with `isVisibleOwnPledge`. Join items by `itemId`. Photo via `catalogItemPhotograph`. Title is `InlineLink` to the ficha. First fact: quantity + pledge status. Second fact: `Faltan N` / `Ya está cubierto.` only if the item is in `items`. Cancel only if `isActivePledge`. No contact/phone/address.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/account/own-pledges.test.tsx src/domain/pledge-status.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** — only if asked.

### Task 3: Load catalog on `/cuenta`

**Files:**
- Modify: `components/screens/account/account-screen.tsx`
- Modify: `components/account/account-panels.tsx`

**Interfaces:**
- Consumes: `getCatalog({ dataLayer, logger })`, `isVisibleOwnPledge`
- Produces: `PledgesPanel` receives `items: readonly DonationItem[]`. `resolveAccountSection(section, pledges.some(isVisibleOwnPledge))`.

- [ ] **Step 1: Wire the screen**

`Promise.all` of `readViewer`, `getOwnAccount`, `getCatalog`. If catalog is not `ok`, pass `[]`. Visible pledges decide the default section.

- [ ] **Step 2: Typecheck the touched files**

Run: `npx tsc --noEmit --pretty false` is too heavy; run `npx vitest run components/account/account-section.test.ts components/account/own-pledges.test.tsx`

Expected: PASS. `account-section` contract unchanged.

- [ ] **Step 3: Commit** — only if asked.

### Task 4: E2e and contract

**Files:**
- Modify: `e2e/con-datos/catalogo.spec.ts`
- Modify: `specs/002-cuentas-y-catalogo-de-donaciones/contracts/cuentas.md`

- [ ] **Step 1: After reserve, assert the ficha link and item status**

The test item has quantity 1, so after A reserves: title is a link, `Vence el`, `Ya está cubierto.` After cancel: empty copy, not `La cancelaste.` Conflict for B unchanged.

- [ ] **Step 2: One line in the cuentas contract**

Mis donaciones is inventory (photo, your reservation, the item); it does not list cancelled or expired. Opening `/cuenta` without query looks at that filtered list.

- [ ] **Step 3: Commit** — only if asked.
