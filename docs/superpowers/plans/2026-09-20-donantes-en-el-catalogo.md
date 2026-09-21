# Donantes en el catálogo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En `/catalogo` y en la ficha, quien eligió aparecer se ve con retrato (si hay), nombre y cantidad o %.

**Architecture:** `has_portrait` es la sexta columna pública de la reserva (ADR-030). `takenStatus` agrupa y entrega `claimId` + `hasPortrait`. `CatalogDonors` pinta la lista. La foto se pide a `/catalogo/retrato/[id]`: el caso de uso comprueba la vista anónima y después baja el archivo con `createAuthAdminClient` (tercer uso documentado de `SUPABASE_SECRET_KEY`; no viaja al HTML).

**Tech Stack:** Next.js App Router, Supabase RLS + storage privado `avatares`, Vitest, Playwright, pgTAP, copy en `content/{es,en}/catalogo.json`.

## Global Constraints

- Se trabaja sobre `main`, sin ramas ni PRs.
- `typescript` mayor 6, `eslint` mayor 9; no se tocan dependencias.
- Tokens de `@theme` solamente; se diseña a 390 px primero.
- HTML público idéntico con o sin sesión (ADR-037 punto 1).
- El bucket `avatares` sigue privado. El HTML no nombra `user_id` ni `{user_id}/retrato.jpg`.
- Retrato público: rectangular, `w-2xl` (48 px), sin radio. No se inventa una cara.
- Archivo de código ≤ 300 líneas (sin blancos ni comentarios).
- TDD: test en rojo antes de implementar, donde toca dominio, policies o la ruta.
- No commitear salvo pedido explícito.
- Spec: `docs/superpowers/specs/2026-09-20-donantes-en-el-catalogo-design.md`.

## File map

- Create: `components/catalog/donors.tsx`, `components/catalog/donors.test.tsx`, `src/domain/ports/catalog-portraits.ts`, `src/application/catalog/public-claim-portrait.ts`, `src/application/catalog/public-claim-portrait.test.ts`, `src/infrastructure/supabase/catalog-portrait-port.ts`, `app/(es)/catalogo/retrato/[id]/route.ts`, `app/(es)/catalogo/retrato/[id]/response.ts`, `app/(en)/en/catalogo/retrato/[id]/route.ts`, `supabase/migrations/20260921123000_catalog_claim_portrait.sql`
- Modify: `src/domain/entities/catalog-claim.ts`, `src/domain/catalog.ts`, `src/domain/catalog.test.ts`, `src/domain/entities/donation-item.ts`, `components/catalog/taken-names.ts`, `components/catalog/taken-names.test.ts`, `components/catalog/inventory.tsx`, `components/catalog/inventory.test.tsx`, `components/catalog/item.tsx`, `components/catalog/item.test.tsx`, `src/infrastructure/supabase/catalog-repository.ts`, `src/infrastructure/supabase/database.types.ts`, `src/infrastructure/supabase/auth-admin.ts`, `src/application/use-cases/get-catalog-claims.test.ts`, `content/schemas/pages.ts`, `content/es/catalogo.json`, `content/en/catalogo.json`, `content/es/cuenta.json`, `content/en/cuenta.json`, `supabase/tests/080-donantes-y-muro.sql`, `e2e/con-datos/catalogo.spec.ts`, `docs/privacy.md`, `docs/security.md`, `docs/adr/037-chrome-de-cuenta.md`, `docs/adr/052-porcentaje-de-ese-item.md`, `specs/002-cuentas-y-catalogo-de-donaciones/spec.md`, `specs/002-cuentas-y-catalogo-de-donaciones/data-model.md`, `specs/002-cuentas-y-catalogo-de-donaciones/contracts/catalogo.md`
- Do not touch: el muro `/quienes-ayudaron`, `donation_wall`, el backoffice, `avatares` como bucket público.

Si `20260921123000_…` no queda última en `supabase/migrations/`, usar un timestamp posterior al último archivo que ya esté.

---

### Task 1: Dominio — `hasPortrait`, `claimId` y unidades contables

**Files:**
- Modify: `src/domain/entities/catalog-claim.ts`
- Modify: `src/domain/entities/donation-item.ts`
- Modify: `src/domain/catalog.ts`
- Modify: `src/domain/catalog.test.ts`
- Modify: `src/application/use-cases/get-catalog-claims.test.ts` (el literal `CLAIM` suma `hasPortrait`)

**Interfaces:**
- Consumes: `CatalogClaim` actual (`id`, `itemId`, `quantity`, `donorDisplayName`, `fulfilledAt`); `shareOfItem`; `DonationUnit`
- Produces:
  - `CatalogClaim.hasPortrait: boolean`
  - `NamedTake { name, quantity, percentOfItem, claimId, hasPortrait }`
  - `isCountableUnit(unit: DonationUnit): boolean` — `true` para `unidad` | `bolsa` | `juego`

- [ ] **Step 1: Ampliar los tests de `takenStatus` y agregar `isCountableUnit`**

En `src/domain/catalog.test.ts`, el caso «tomada con nombre» queda así (y el de «cinco de diez» igual: `claimId: "a"`, `hasPortrait: false`):

```ts
it("tomada con nombre: lista una vez cada quien eligió aparecer, con el % de ese ítem", () => {
  expect(
    takenStatus({ ...item, remainingQuantity: 2 }, [
      {
        id: "a",
        itemId: "item-1",
        quantity: 2,
        donorDisplayName: "María",
        fulfilledAt: null,
        hasPortrait: true,
      },
      {
        id: "b",
        itemId: "item-1",
        quantity: 1,
        donorDisplayName: "María",
        fulfilledAt: "2026-09-14T00:00:00.000Z",
        hasPortrait: true,
      },
      {
        id: "c",
        itemId: "item-2",
        quantity: 1,
        donorDisplayName: "Ajeno",
        fulfilledAt: null,
        hasPortrait: false,
      },
    ]),
  ).toEqual({
    taken: true,
    names: [
      {
        name: "María",
        quantity: 3,
        percentOfItem: 60,
        claimId: "a",
        hasPortrait: true,
      },
    ],
  });
});

it("isCountableUnit: bolsas y juegos se cuentan; metros y litros no", () => {
  expect(isCountableUnit("unidad")).toBe(true);
  expect(isCountableUnit("bolsa")).toBe(true);
  expect(isCountableUnit("juego")).toBe(true);
  expect(isCountableUnit("metro")).toBe(false);
  expect(isCountableUnit("metro_cuadrado")).toBe(false);
  expect(isCountableUnit("metro_cubico")).toBe(false);
  expect(isCountableUnit("litro")).toBe(false);
});
```

Importar `isCountableUnit` desde `./catalog`. Cada literal `CatalogClaim` del archivo suma `hasPortrait`.

- [ ] **Step 2: Ver rojo**

Run: `npx vitest run src/domain/catalog.test.ts`

Expected: FAIL — `hasPortrait` no existe en el tipo y/o `isCountableUnit` no está exportada.

- [ ] **Step 3: Implementar lo mínimo**

`CatalogClaim`:

```ts
export interface CatalogClaim {
  readonly id: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly donorDisplayName: string;
  readonly fulfilledAt: string | null;
  readonly hasPortrait: boolean;
}
```

`NamedTake` y el agrupado en `takenStatus`:

```ts
export interface NamedTake {
  readonly name: string;
  readonly quantity: number;
  readonly percentOfItem: number | null;
  readonly claimId: string;
  readonly hasPortrait: boolean;
}
```

Al agrupar, guardar el primer `id` y el `hasPortrait` en OR:

```ts
const quantities = new Map<string, number>();
const firstId = new Map<string, string>();
const portraits = new Map<string, boolean>();
const order: string[] = [];

for (const claim of claims) {
  if (claim.itemId !== item.id) {
    continue;
  }

  const previous = quantities.get(claim.donorDisplayName);

  if (previous === undefined) {
    order.push(claim.donorDisplayName);
    quantities.set(claim.donorDisplayName, claim.quantity);
    firstId.set(claim.donorDisplayName, claim.id);
    portraits.set(claim.donorDisplayName, claim.hasPortrait);
    continue;
  }

  quantities.set(claim.donorDisplayName, previous + claim.quantity);
  portraits.set(
    claim.donorDisplayName,
    (portraits.get(claim.donorDisplayName) ?? false) || claim.hasPortrait,
  );
}

// en el map a NamedTake:
claimId: firstId.get(name) ?? "",
hasPortrait: portraits.get(name) ?? false,
```

En `donation-item.ts`:

```ts
const COUNTABLE_UNITS: ReadonlySet<DonationUnit> = new Set([
  "unidad",
  "bolsa",
  "juego",
]);

export function isCountableUnit(unit: DonationUnit): boolean {
  return COUNTABLE_UNITS.has(unit);
}
```

Re-exportar `isCountableUnit` desde `src/domain/catalog.ts`.

En `get-catalog-claims.test.ts`, `CLAIM` suma `hasPortrait: false`.

- [ ] **Step 4: Ver verde**

Run: `npx vitest run src/domain/catalog.test.ts src/application/use-cases/get-catalog-claims.test.ts`

Expected: PASS. El typecheck del resto de literales `CatalogClaim` puede seguir en rojo hasta la Task 4; si `tsc` se corre, completar `hasPortrait: false` en `inventory.test.tsx` e `item.test.tsx` en este mismo paso, sin cambiar aserciones todavía.

- [ ] **Step 5: No commitear** salvo que el usuario lo pida.

---

### Task 2: Cifra — cantidad o %

**Files:**
- Modify: `components/catalog/taken-names.ts`
- Modify: `components/catalog/taken-names.test.ts`
- Modify: `content/schemas/pages.ts` (agregar `namedQuantity` y `donorsLabel` junto a `namedShare`)
- Modify: `content/es/catalogo.json`, `content/en/catalogo.json`
- Modify: `content/es/cuenta.json`, `content/en/cuenta.json` (`appearanceLead`)

**Interfaces:**
- Consumes: `NamedTake`, `isCountableUnit`, `DonationUnit`, `unitLabel`, `formatPercentage`
- Produces: `formatTakenLine(entry, unit, copy): string`

- [ ] **Step 1: Tests de la línea**

Reemplazar `components/catalog/taken-names.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { formatTakenLine } from "./taken-names";

const COPY = {
  namedShare: "{name} · {percent}",
  namedQuantity: "{name} · {quantity} {unit}",
  units: {
    unidad: { one: "unidad", other: "unidades" },
    metro: { one: "metro", other: "metros" },
    metro_cuadrado: { one: "metro cuadrado", other: "metros cuadrados" },
    metro_cubico: { one: "metro cúbico", other: "metros cúbicos" },
    bolsa: { one: "bolsa", other: "bolsas" },
    litro: { one: "litro", other: "litros" },
    juego: { one: "juego", other: "juegos" },
  },
};

const ana = {
  name: "Ana",
  quantity: 4,
  percentOfItem: 40,
  claimId: "c1",
  hasPortrait: false,
};

describe("formatTakenLine", () => {
  it("en bolsas habla en cantidad", () => {
    expect(formatTakenLine(ana, "bolsa", COPY)).toBe("Ana · 4 bolsas");
  });

  it("en metros habla en %", () => {
    expect(formatTakenLine(ana, "metro", COPY)).toBe("Ana · 40%");
  });

  it("en una medida sin % deja el nombre", () => {
    expect(
      formatTakenLine({ ...ana, percentOfItem: null }, "litro", COPY),
    ).toBe("Ana");
  });

  it("una bolsa no pluraliza", () => {
    expect(
      formatTakenLine({ ...ana, quantity: 1 }, "bolsa", COPY),
    ).toBe("Ana · 1 bolsa");
  });
});
```

- [ ] **Step 2: Ver rojo**

Run: `npx vitest run components/catalog/taken-names.test.ts`

Expected: FAIL — `formatTakenLine` no existe.

- [ ] **Step 3: Implementar**

`taken-names.ts`:

```ts
import type { NamedTake } from "@/src/domain/catalog";
import { isCountableUnit } from "@/src/domain/catalog";
import type { DonationUnit } from "@/src/domain/entities";
import { formatPercentage } from "@/src/domain/percentage";
import { fill } from "@/src/i18n/fill";

import { unitLabel } from "./units";

export function formatTakenLine(
  entry: NamedTake,
  unit: DonationUnit,
  copy: {
    readonly namedShare: string;
    readonly namedQuantity: string;
    readonly units: {
      readonly [K in DonationUnit]: { readonly one: string; readonly other: string };
    };
  },
): string {
  if (isCountableUnit(unit)) {
    return fill(copy.namedQuantity, {
      name: entry.name,
      quantity: String(entry.quantity),
      unit: unitLabel(copy, unit, entry.quantity),
    });
  }

  if (entry.percentOfItem === null) {
    return entry.name;
  }

  return fill(copy.namedShare, {
    name: entry.name,
    percent: formatPercentage(entry.percentOfItem),
  });
}
```

Borrar `formatTakenNames` cuando Task 5 deje de usarla.

Copy:

- es `namedShare`: `{name} · {percent}`
- en `namedShare`: `{name} · {percent}`
- es `namedQuantity`: `{name} · {quantity} {unit}`
- en `namedQuantity`: `{name} · {quantity} {unit}`
- es `donorsLabel`: `Quién tomó esto`
- en `donorsLabel`: `Who claimed this`
- es `appearNamedHint`: `Si no marcás esto, lo que traigas se cuenta sin tu nombre ni tu foto. Es el valor por defecto.`
- en `appearNamedHint`: `If you leave this unchecked, what you bring is counted without your name or photo. That is the default.`
- es `appearanceLead`: agregar que, si hay foto, también se ve la cara en el catálogo.
- en `appearanceLead`: lo mismo.

Schema: `namedQuantity: z.string().min(1)` y `donorsLabel: z.string().min(1)` al lado de `namedShare`.

- [ ] **Step 4: Ver verde**

Run: `npx vitest run components/catalog/taken-names.test.ts content/schema.test.ts content/account.test.ts`

Expected: PASS. Si el schema test falla por claves faltantes, es este paso: las dos JSON + schema.

- [ ] **Step 5: No commitear** salvo que el usuario lo pida.

---

### Task 3: Base — `has_portrait`, disparador, grant y vista

**Files:**
- Create: `supabase/migrations/20260921123000_catalog_claim_portrait.sql`
- Modify: `supabase/tests/080-donantes-y-muro.sql` (el array de cinco columnas pasa a seis; `throws_ok` de `portrait_path` en pledges si no está)
- Modify: `src/infrastructure/supabase/database.types.ts` (`donation_pledges.Row/Insert/Update` y `donation_catalog_claims`)

**Interfaces:**
- Consumes: policy actual de `anon` sobre `donation_pledges` (los estados que ya publica el catálogo)
- Produces: columna `has_portrait boolean not null default false`; vista con esa columna; `anon` SELECT exactamente `donor_display_name`, `fulfilled_at`, `has_portrait`, `id`, `item_id`, `quantity`

- [ ] **Step 1: Ampliar pgTAP en rojo**

En `080-donantes-y-muro.sql`, el array de columnas de `anon` pasa a:

```sql
array['donor_display_name', 'fulfilled_at', 'has_portrait', 'id', 'item_id', 'quantity']::text[],
'anon lee exactamente las seis columnas públicas, ni una más'
```

Agregar `column_privs_are` de `has_portrait` (SELECT) y `throws_ok` de `select portrait_path from public.donation_pledges`.

Agregar un caso: con un donante no anónimo y `portrait_path` puesto, `has_portrait` es true en la vista; al poner `portrait_path = null`, pasa a false. Reusar el setup de retratos que ya tiene el archivo (~línea 165).

- [ ] **Step 2: Ver rojo**

Run: `npm run db:verify` (o el `pg_prove` de `080-donantes-y-muro.sql` si el resto del reset no hace falta)

Expected: FAIL — `has_portrait` no existe.

- [ ] **Step 3: Migración**

```sql
-- Sexta columna pública: si esa reserva tiene retrato (FR-246 enmendado).
-- El path no se otorga. Lo mantiene un disparador (ADR-030).

alter table public.donation_pledges
  add column has_portrait boolean not null default false;

comment on column public.donation_pledges.has_portrait is
  'Si el perfil de esta reserva tiene retrato. Lo mantiene un disparador. Público vía grant y donation_catalog_claims.';

grant select (has_portrait) on public.donation_pledges to anon;

create or replace function private.sync_pledge_has_portrait_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.donation_pledges as p
     set has_portrait = (new.portrait_path is not null)
   where p.user_id = new.id
     and p.is_anonymous = false;
  return new;
end;
$$;

create trigger donor_profiles_sync_pledge_has_portrait
  after insert or update of portrait_path on public.donor_profiles
  for each row
  execute function private.sync_pledge_has_portrait_from_profile();

create or replace function private.sync_pledge_has_portrait_from_pledge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  if new.is_anonymous or new.user_id is null then
    new.has_portrait := false;
    return new;
  end if;

  select d.portrait_path into v_path
    from public.donor_profiles as d
   where d.id = new.user_id;

  new.has_portrait := v_path is not null;
  return new;
end;
$$;

create trigger donation_pledges_sync_has_portrait
  before insert or update of user_id, is_anonymous on public.donation_pledges
  for each row
  execute function private.sync_pledge_has_portrait_from_pledge();

update public.donation_pledges as p
   set has_portrait = exists (
     select 1
       from public.donor_profiles as d
      where d.id = p.user_id
        and d.portrait_path is not null
   )
 where p.is_anonymous = false
   and p.user_id is not null;

create or replace view public.donation_catalog_claims
  with (security_invoker = true)
as
select p.id,
       p.item_id,
       p.quantity,
       p.donor_display_name,
       p.fulfilled_at,
       p.has_portrait
  from public.donation_pledges p;

comment on view public.donation_catalog_claims is
  'Quién tomó un ítem y eligió aparecer. Seis columnas, las del GRANT. Lo anónimo lo filtra la policy (FR-255).';
```

`donation_wall` **no** suma `has_portrait`.

En `database.types.ts`: `has_portrait: boolean` en pledges; `has_portrait: boolean | null` en la vista (las vistas llegan nullable).

- [ ] **Step 4: Ver verde**

Run: `npm run db:verify`

Expected: PASS. `check:rls` sigue verde: las dos funciones tienen `search_path = ''`.

- [ ] **Step 5: No commitear** salvo que el usuario lo pida.

---

### Task 4: Repositorio público lee `has_portrait`

**Files:**
- Modify: `src/infrastructure/supabase/catalog-repository.ts`

**Interfaces:**
- Consumes: vista con `has_portrait`
- Produces: `CatalogClaim.hasPortrait` mapeado desde `row.has_portrait === true`

- [ ] **Step 1: El mapeo exige la columna**

`CLAIM_COLUMNS` pasa a `"id, item_id, quantity, donor_display_name, fulfilled_at, has_portrait"`.

`toClaim`:

```ts
return {
  id: row.id,
  itemId: row.item_id,
  quantity: row.quantity,
  donorDisplayName: row.donor_display_name,
  fulfilledAt: row.fulfilled_at,
  hasPortrait: row.has_portrait === true,
};
```

No hay test de repositorio aislado; el typecheck es la red. Si `ClaimRow` todavía no tiene el campo, Task 3 no cerró.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` (o el `typecheck` del repo, con `next typegen` si hace falta)

Expected: PASS para este archivo. Completar `hasPortrait` en cualquier literal que `tsc` nombre.

- [ ] **Step 3: No commitear** salvo que el usuario lo pida.

---

### Task 5: `CatalogDonors` en listado y ficha

**Files:**
- Create: `components/catalog/donors.tsx`, `components/catalog/donors.test.tsx`
- Modify: `components/catalog/inventory.tsx`, `components/catalog/inventory.test.tsx`, `components/catalog/item.tsx`, `components/catalog/item.test.tsx`
- Modify: `e2e/con-datos/catalogo.spec.ts`

**Interfaces:**
- Consumes: `takenStatus`, `formatTakenLine`, `localizedHref`, `CatalogContent.donorsLabel`
- Produces: `<ul aria-label={donorsLabel}>` con un `<li>` por persona; `<img>` sólo si `hasPortrait`

- [ ] **Step 1: Tests del bloque**

`donors.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CatalogContent } from "@/content/schema";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";

import { CatalogDonors } from "./donors";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

const COPY = {
  donorsLabel: "Quién tomó esto",
  namedShare: "{name} · {percent}",
  namedQuantity: "{name} · {quantity} {unit}",
  units: {
    unidad: { one: "unidad", other: "unidades" },
    metro: { one: "metro", other: "metros" },
    metro_cuadrado: { one: "metro cuadrado", other: "metros cuadrados" },
    metro_cubico: { one: "metro cúbico", other: "metros cúbicos" },
    bolsa: { one: "bolsa", other: "bolsas" },
    litro: { one: "litro", other: "litros" },
    juego: { one: "juego", other: "juegos" },
  },
} as unknown as CatalogContent;

function item(partial: Partial<DonationItem> = {}): DonationItem {
  return {
    id: "item-tina",
    campaignId: "camp-1",
    budgetItemId: null,
    title: "Tina",
    description: null,
    unit: "bolsa",
    category: "materiales",
    neededQuantity: 10,
    remainingQuantity: 6,
    fulfilledQuantity: 4,
    estimatedValue: null,
    photo: null,
    sortOrder: 1,
    ...partial,
  };
}

function claim(partial: Partial<CatalogClaim> = {}): CatalogClaim {
  return {
    id: "c1",
    itemId: "item-tina",
    quantity: 4,
    donorDisplayName: "Ana",
    fulfilledAt: null,
    hasPortrait: false,
    ...partial,
  };
}

describe("CatalogDonors", () => {
  it("sin nombres no pinta el bloque", () => {
    const { container } = render(
      <CatalogDonors item={item({ remainingQuantity: 10, fulfilledQuantity: 0 })} claims={[]} copy={COPY} locale="es" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("bolsas: nombre y cantidad; sin img si no hay foto", () => {
    render(
      <CatalogDonors item={item()} claims={[claim()]} copy={COPY} locale="es" />,
    );
    expect(screen.getByRole("list", { name: /quién tomó esto/i })).toBeInTheDocument();
    expect(screen.getByText("Ana · 4 bolsas")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("con foto: img a la ruta de esa reserva, alt vacío", () => {
    render(
      <CatalogDonors
        item={item()}
        claims={[claim({ hasPortrait: true })]}
        copy={COPY}
        locale="es"
      />,
    );
    const photo = screen.getByRole("img");
    expect(photo).toHaveAttribute("src", "/catalogo/retrato/c1");
    expect(photo).toHaveAttribute("alt", "");
  });

  it("metros: %; en /en la ruta lleva prefijo", () => {
    render(
      <CatalogDonors
        item={item({ unit: "metro", remainingQuantity: 6 })}
        claims={[claim()]}
        copy={COPY}
        locale="en"
      />,
    );
    expect(screen.getByText("Ana · 40%")).toBeInTheDocument();
    render(
      <CatalogDonors
        item={item()}
        claims={[claim({ id: "c2", hasPortrait: true })]}
        copy={COPY}
        locale="en"
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "/en/catalogo/retrato/c2");
  });
});
```

Inventario: el test «María donó el 100%» pasa a «María · 1 unidad» (Tina es `unidad`). El de Ana 50% con `neededQuantity: 10` pasa a «Ana · 5 unidades». Quitar la aserción de la frase vieja.

Ficha: las mismas aserciones de nombre.

E2e `catalogo.spec.ts`: en el catálogo, `${visible} donó el 50%` pasa a `${visible} · 5 unidades` (el ítem de `conItemPublicado` es `unidad`). El muro **sigue** con `donó el 50%`. `esperarQueAparezca(request, "/catalogo", "donó el 50%")` pasa a esperar `· 5 unidades`. El caso que afirma `/donó el/` ausente en la fila pasa a `/·/` o el nombre visible.

- [ ] **Step 2: Ver rojo**

Run: `npx vitest run components/catalog/donors.test.tsx`

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar**

`donors.tsx`:

```tsx
import Image from "next/image";

import type { CatalogContent } from "@/content/schema";
import { takenStatus } from "@/src/domain/catalog";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

import { formatTakenLine } from "./taken-names";

export function CatalogDonors({
  item,
  claims,
  copy,
  locale,
}: {
  item: DonationItem;
  claims: readonly CatalogClaim[];
  copy: CatalogContent;
  locale: Locale;
}) {
  const taken = takenStatus(item, claims);

  if (taken.names.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2xs flex flex-col gap-2xs" aria-label={copy.donorsLabel}>
      {taken.names.map((entry) => (
        <li key={entry.claimId} className="flex items-center gap-xs">
          {entry.hasPortrait ? (
            <Image
              src={localizedHref(`/catalogo/retrato/${entry.claimId}`, locale)}
              alt=""
              width={48}
              height={48}
              className="h-2xl w-2xl shrink-0 object-cover"
            />
          ) : null}
          <span className="font-ui text-small text-ink-faint">
            {formatTakenLine(entry, item.unit, copy)}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

En `inventory.tsx` e `item.tsx`: borrar `formatTakenNames` / el `<p>` de nombres; renderizar `<CatalogDonors item={item} claims={claims} copy={copy} locale={locale} />` en el mismo lugar.

- [ ] **Step 4: Ver verde**

Run: `npx vitest run components/catalog/donors.test.tsx components/catalog/inventory.test.tsx components/catalog/item.test.tsx`

Expected: PASS.

- [ ] **Step 5: No commitear** salvo que el usuario lo pida.

---

### Task 6: Ruta pública del retrato

**Files:**
- Create: `src/domain/ports/catalog-portraits.ts`
- Create: `src/application/catalog/public-claim-portrait.ts`
- Create: `src/application/catalog/public-claim-portrait.test.ts`
- Create: `src/infrastructure/supabase/catalog-portrait-port.ts`
- Create: `app/(es)/catalogo/retrato/[id]/response.ts`
- Create: `app/(es)/catalogo/retrato/[id]/route.ts`
- Create: `app/(en)/en/catalogo/retrato/[id]/route.ts`
- Modify: `src/infrastructure/supabase/auth-admin.ts` (comentario: tercer uso)
- Modify: `docs/security.md` (la fila de `SUPABASE_SECRET_KEY`)

**Interfaces:**
- Consumes: `donation_catalog_claims` (cliente anónimo); `createAuthAdminClient()` para bajar el archivo
- Produces: `getPublicClaimPortrait(deps, claimId) → DataResult<{ bytes: ArrayBuffer; mimeType: string }>`

El puerto **no** vive en `CatalogRepository`: ese cliente es `anon` y no puede leer `portrait_path`. Autorización = la fila existe en la vista. Bajada = clave secreta, un pledge, un path, un signed URL que se descarta. El HTML nunca ve el path.

- [ ] **Step 1: Tests del caso de uso**

```ts
import { describe, expect, it } from "vitest";

import type { CatalogPortraitPort } from "@/src/domain/ports/catalog-portraits";

import { fakeLogger } from "../test-support/fake-data-layer";
import { getPublicClaimPortrait } from "./public-claim-portrait";

class FakePortraitPort implements CatalogPortraitPort {
  constructor(
    private readonly file: { bytes: ArrayBuffer; mimeType: string } | null,
  ) {}

  async readPublicClaimPortrait(): Promise<{
    bytes: ArrayBuffer;
    mimeType: string;
  } | null> {
    return this.file;
  }
}

describe("getPublicClaimPortrait", () => {
  it("sirve el archivo cuando el puerto lo encuentra", async () => {
    const bytes = new ArrayBuffer(4);
    const result = await getPublicClaimPortrait(
      { port: new FakePortraitPort({ bytes, mimeType: "image/jpeg" }), logger: fakeLogger() },
      "c1",
    );
    expect(result).toEqual({
      status: "ok",
      data: { bytes, mimeType: "image/jpeg" },
    });
  });

  it("sin archivo es 404, no un error", async () => {
    const result = await getPublicClaimPortrait(
      { port: new FakePortraitPort(null), logger: fakeLogger() },
      "c1",
    );
    expect(result).toEqual({ status: "unavailable", reason: "not-published" });
  });

  it("sin puerto no inventa una foto", async () => {
    const result = await getPublicClaimPortrait(
      { port: null, logger: fakeLogger() },
      "c1",
    );
    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });
});
```

- [ ] **Step 2: Ver rojo**

Run: `npx vitest run src/application/catalog/public-claim-portrait.test.ts`

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Caso de uso, puerto y ruta**

Puerto:

```ts
export interface CatalogPortraitPort {
  readPublicClaimPortrait(claimId: string): Promise<{
    readonly bytes: ArrayBuffer;
    readonly mimeType: string;
  } | null>;
}
```

Caso de uso: si `port === null` → `unavailable("not-configured")`. Si `readPublicClaimPortrait` devuelve null → `unavailable("not-published")`. Si tira → log + `unavailable("error")`. Si hay archivo → `ok`.

Adaptador (`catalog-portrait-port.ts`):

1. Cliente anónimo: `.from("donation_catalog_claims").select("id, has_portrait").eq("id", claimId).maybeSingle()`. Si no hay fila o `has_portrait !== true`, `return null`.
2. `createAuthAdminClient()`: si es null, `return null`.
3. Con el secreto: leer `user_id` de `donation_pledges` (ese id) y `portrait_path` de `donor_profiles`. Si falta path, `return null`.
4. `createSignedUrl` 60 s, `fetch`, devolver bytes y mime. No devolver el path.

`response.ts` (espejo de `cuenta/retrato/response.ts`):

- 404 + `Cache-Control: no-store` si unavailable
- 200 + mime + `nosniff` + `Cache-Control: public, max-age=60` si ok
- El body es el binario. Prohibido interpolar `user_id` en headers o cuerpo.

`route.ts` es y en: `GET` → `publicClaimPortraitResponse(id)` con `dynamic = "force-dynamic"`.

Actualizar el comentario de `auth-admin.ts` y la tabla de `docs/security.md`: la clave también baja un retrato de catálogo **después** de que la vista anónima autorizó esa reserva. Sigue sin usarse para listar tablas.

- [ ] **Step 4: Ver verde**

Run: `npx vitest run src/application/catalog/public-claim-portrait.test.ts`

Expected: PASS.

Un test del adaptador no es obligatorio si no hay harness de storage. La garantía de «el cuerpo no contiene un UUID de cuenta» es: el response sólo escribe `file.bytes`.

- [ ] **Step 5: No commitear** salvo que el usuario lo pida.

---

### Task 7: Documentación

**Files:**
- Modify: `specs/002-cuentas-y-catalogo-de-donaciones/spec.md` (FR-246, FR-255)
- Modify: `specs/002-cuentas-y-catalogo-de-donaciones/data-model.md` (sexta columna, vista)
- Modify: `specs/002-cuentas-y-catalogo-de-donaciones/contracts/catalogo.md`
- Modify: `docs/adr/037-chrome-de-cuenta.md` (punto 2: el catálogo sí publica la cara; el muro no)
- Modify: `docs/adr/052-porcentaje-de-ese-item.md` (catálogo: contable = unidades; medida = %)
- Modify: `docs/privacy.md` (fila del retrato)

**Interfaces:** ninguna. Copy de la spec de diseño, sin prosa nueva de campaña.

- [ ] **Step 1: Enmendar**

FR-246: el archivo MUST vivir en un bucket privado y MUST NOT aparecer en el muro. MUST aparecer en el catálogo si y sólo si esa persona eligió aparecer y `has_portrait`.

FR-255: además del nombre, MUST mostrar el retrato si hay, y la cifra según la unidad (cantidad en `unidad`/`bolsa`/`juego`; % en las medidas). MUST omitir un % truncado a 0.

ADR-037 punto 2: tachar «el catálogo no lo nombra». El bucket sigue privado; la ruta pública es el id de la reserva. La alternativa «Foto en el muro» sigue descartada.

ADR-052: agregar que la interfaz del **catálogo** habla en unidades cuando el bien es contable. El muro sigue en %.

`privacy.md`: el retrato se publica en `/catalogo` cuando la donación no es anónima.

- [ ] **Step 2: Releer contra la spec de diseño**

Cada sección de `2026-09-20-donantes-en-el-catalogo-design.md` tiene un cambio en docs o en código. El muro no se mencionó como cambiado.

- [ ] **Step 3: No commitear** salvo que el usuario lo pida.

---

## Verificación final

```bash
npx vitest run src/domain/catalog.test.ts components/catalog/taken-names.test.ts components/catalog/donors.test.tsx components/catalog/inventory.test.tsx components/catalog/item.test.tsx src/application/catalog/public-claim-portrait.test.ts
npm run db:verify
npm run verify
```

`verify` en verde es la condición para pushear. No pushear en este plan.
