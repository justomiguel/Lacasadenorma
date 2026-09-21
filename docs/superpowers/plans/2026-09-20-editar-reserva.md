# Editar una reserva anotada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans in this session. Se trabaja sobre `main` (constitución). Sin ramas ni pull requests.

**Goal:** Quien reservó puede cambiar cantidad y nota de una reserva `reserved`. El equipo puede corregir cualquiera, y nombre/teléfono si nació por teléfono.

**Architecture:** Una RPC `update_donation_pledge`, mismo patrón que cancelar: dueño o `admin`+. El ítem se mueve con `reserved_quantity + (nueva − actual)` y el mismo `update` condicional que al anotar. Sin correo nuevo. Rastro `pledge.updated`.

**Tech Stack:** TypeScript, Postgres (`security definer` + `search_path = ''`), Vitest, pgTAP, Next.js App Router, Playwright.

## Global Constraints

- Se trabaja sobre `main`. No hay ramas ni pull requests.
- Tests primero; el rojo tiene que ser por la feature que falta.
- `typescript` mayor 6, `eslint` mayor 9. Archivos de código ≤ 300 líneas (sin blancos ni comentarios). Si un archivo se acerca, se parte; no se sube el número.
- Copy pública en `content/es` y `content/en`. El backoffice no se traduce.
- Solo se edita `reserved`. El plazo no se renueva. No se manda `staff.new_pledge`.
- Commit al terminar un cambio lógico, **solo si la dueña lo pidió**.

Spec: `docs/superpowers/specs/2026-09-20-editar-reserva-design.md`.

---

### Task 1: Dominio — `canEditPledge`

**Files:**
- Modify: `src/domain/entities/donation-pledge.ts`
- Test: `src/domain/pledge-status.test.ts`

**Interfaces:**
- Consumes: `PledgeStatus`
- Produces: `canEditPledge(status: PledgeStatus): boolean`

- [ ] **Step 1: Write the failing test**

In `src/domain/pledge-status.test.ts`, next to `isVisibleOwnPledge`:

```ts
import { canEditPledge, isVisibleOwnPledge } from "./entities/donation-pledge";

describe("canEditPledge", () => {
  it("solo reserved se edita", () => {
    expect(canEditPledge("reserved")).toBe(true);
    expect(canEditPledge("accepted")).toBe(false);
    expect(canEditPledge("fulfilled")).toBe(false);
    expect(canEditPledge("cancelled")).toBe(false);
    expect(canEditPledge("expired")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pledge-status.test.ts`

Expected: FAIL — `canEditPledge` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/domain/entities/donation-pledge.ts`, next to `canStaffReleasePledge`:

```ts
/** Solo anotada: el sí y la llegada cierran la edición. */
export function canEditPledge(status: PledgeStatus): boolean {
  return status === "reserved";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pledge-status.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** — only if the owner asked.

---

### Task 2: Auditoría y puertos

**Files:**
- Modify: `src/domain/entities/audit.ts` — add `"pledge.updated": "editó una reserva"`
- Modify: `src/domain/ports/donations.ts`
- Modify: `src/application/accounts/fake-account-port.ts`
- Modify: `src/application/accounts/cancel-own-pledge.test.ts`
- Modify: `src/application/use-cases/claim-item.test.ts`
- Modify: `src/application/test-support/fake-admin-gateway.ts`

**Interfaces:**
- Consumes: `AuditAction`
- Produces:

```ts
export interface UpdateOwnPledgeInput {
  readonly pledgeId: string;
  readonly quantity: number;
  readonly note: string | null;
}

export interface UpdatePledgeInput {
  readonly id: string;
  readonly quantity: number;
  readonly note: string | null;
  readonly contactName: string | null;
  readonly contactPhone: string | null;
}
```

`DonationsPort.updateOwnPledge(input: UpdateOwnPledgeInput): Promise<void>`  
`AdminDonationsPort.updatePledge(input: UpdatePledgeInput): Promise<void>`

- [ ] **Step 1: Add the audit label**

In `AUDIT_ACTION_LABELS`, after `"pledge.claimed"`:

```ts
  "pledge.updated": "editó una reserva",
```

- [ ] **Step 2: Add the port methods**

In `DonationsPort`, after `cancelOwnPledge`:

```ts
  updateOwnPledge(input: UpdateOwnPledgeInput): Promise<void>;
```

In `AdminDonationsPort`, after `cancelPledge`:

```ts
  updatePledge(input: UpdatePledgeInput): Promise<void>;
```

Export the two input types from the same file.

- [ ] **Step 3: Update every fake**

Each fake that implements a port needs the new method (typecheck fails without it):

```ts
async updateOwnPledge(): Promise<void> {
  return;
}
```

```ts
updatePledge: (input) => record("updatePledge", input, undefined),
```

Files: `fake-account-port.ts`, `cancel-own-pledge.test.ts`, `claim-item.test.ts`, `fake-admin-gateway.ts`.

- [ ] **Step 4: Typecheck the ports**

Run: `npx vitest run src/application/accounts/cancel-own-pledge.test.ts src/application/admin/pledges.test.ts src/application/use-cases/claim-item.test.ts`

Expected: PASS. The new methods exist and nobody calls them yet.

- [ ] **Step 5: Commit** — only if asked.

---

### Task 3: Casos de uso

**Files:**
- Create: `src/application/accounts/update-own-pledge.ts`
- Create: `src/application/accounts/update-own-pledge.test.ts`
- Modify: `src/application/admin/pledges.ts` — if `max-lines` fails, extract `updatePledge` to `src/application/admin/update-pledge.ts` and re-export from `pledges.ts` / `index.ts`
- Modify: `src/application/admin/pledges.test.ts`
- Modify: `src/application/admin/index.ts` — export `updatePledge`
- Modify: `src/infrastructure/supabase/donations-port.ts`
- Modify: `src/infrastructure/supabase/admin/pledges-port.ts`
- Modify: `src/infrastructure/supabase/database.types.ts` — add `update_donation_pledge` under `Functions` (same shape as below). Types go in the same commit as the migration if the RPC is called here; otherwise this step can stub until Task 4 and the port will typecheck after Task 4.

**Interfaces:**
- Consumes: `UpdateOwnPledgeInput`, `UpdatePledgeInput`, `describePledgeFailure`, `perform`
- Produces: `updateOwnPledge(deps, input) → AccountOutcome<null>`, `updatePledge(deps, input) → AdminResult<{ id: string }>`

- [ ] **Step 1: Write the failing own-pledge tests**

`src/application/accounts/update-own-pledge.test.ts` — copy the fake from `cancel-own-pledge.test.ts` and add `updated: UpdateOwnPledgeInput | null`.

```ts
describe("updateOwnPledge", () => {
  it("manda cantidad y nota al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await updateOwnPledge(
      { session: { status: "ready", port: {} as never, donations }, logger: silent },
      { pledgeId: PLEDGE, quantity: 2, note: "La dejo el sábado." },
    );

    expect(result).toEqual({ status: "ok", value: null });
    expect(donations.updated).toEqual({
      pledgeId: PLEDGE,
      quantity: 2,
      note: "La dejo el sábado.",
    });
  });

  it("sin sesión no llega al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await updateOwnPledge(
      { session: { status: "anonymous" }, logger: silent },
      { pledgeId: PLEDGE, quantity: 2, note: null },
    );
    expect(result).toEqual({ status: "error", code: "noSession", field: null });
    expect(donations.updated).toBeNull();
  });

  it("cantidad 0 es quantityInvalid", async () => {
    const donations = new FakeDonationsPort();
    const result = await updateOwnPledge(
      {
        session: { status: "ready", port: {} as never, donations },
        logger: silent,
      },
      { pledgeId: PLEDGE, quantity: 0, note: null },
    );
    expect(result).toEqual({
      status: "error",
      code: "quantityInvalid",
      field: "quantity",
    });
    expect(donations.updated).toBeNull();
  });

  it("traduce sin_disponibilidad", async () => {
    const donations = new FakeDonationsPort();
    donations.failWith = new Error("editar la reserva: sin_disponibilidad (23514)");
    const result = await updateOwnPledge(
      {
        session: { status: "ready", port: {} as never, donations },
        logger: silent,
      },
      { pledgeId: PLEDGE, quantity: 2, note: null },
    );
    expect(result).toEqual({ status: "error", code: "ahead", field: null });
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/application/accounts/update-own-pledge.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `updateOwnPledge`**

Same session guard as `cancelOwnPledge`. Validate UUID and `quantity` integer `>= 1` before the port. `note` trimmed → `null` if empty. Call `port.updateOwnPledge`. Catch with `describePledgeFailure(deps, "editar la reserva", error)`.

- [ ] **Step 4: Write the failing admin test**

In `pledges.test.ts`:

```ts
describe("updatePledge", () => {
  it("edita y deja rastro pledge.updated", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await updatePledge(
      admin,
      { id: PLEDGE, quantity: "2", nota: "Sábado." },
      null,
    );

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "updatePledge")).toMatchObject({
      input: {
        id: PLEDGE,
        quantity: 2,
        note: "Sábado.",
        contactName: null,
        contactPhone: null,
      },
    });
    expect(fake.audit[0]).toMatchObject({
      action: "pledge.updated",
      entityTable: "donation_pledges",
      entityId: PLEDGE,
    });
  });

  it("cantidad 0 no llega al puerto", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await updatePledge(admin, { id: PLEDGE, quantity: "0" }, null);
    expect(result.status).toBe("invalid");
    expect(fake.calls.find((call) => call.name === "updatePledge")).toBeUndefined();
  });
});
```

Invalid Zod is `{ status: "invalid" }` and `fake.calls` stays `[]`, same as `cancelPledge` with empty reason.

- [ ] **Step 5: Implement `updatePledge`**

Schema:

```ts
const updateSchema = z.object({
  id: uuid("la reserva"),
  quantity: z.coerce.number().int().min(1, "La cantidad tiene que ser un entero mayor que cero."),
  nota: optionalText(500),
  contactName: optionalText(80),
  contactPhone: optionalText(40),
});
```

`perform` with `donaciones.escribir`, `describe: "editar la reserva"`, `success: () => "Reserva actualizada."`, audit `pledge.updated`. **No mail.**

If `pledges.ts` trips `max-lines`, move this function to `src/application/admin/update-pledge.ts`.

- [ ] **Step 6: Wire the ports** (can wait until Task 4 if types are missing)

```ts
async updateOwnPledge(input): Promise<void> {
  const { error } = await client.rpc("update_donation_pledge", {
    p_pledge_id: input.pledgeId,
    p_quantity: input.quantity,
    p_note: input.note,
  });
  if (error !== null) {
    throw new QueryError("editar la reserva", error);
  }
}
```

Admin port passes `p_contact_name` and `p_contact_phone` as well.

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/application/accounts/update-own-pledge.test.ts src/application/admin/pledges.test.ts`

Expected: PASS

- [ ] **Step 8: Commit** — only if asked.

---

### Task 4: Base — `update_donation_pledge`

**Files:**
- Create: `supabase/migrations/20260921020000_update_donation_pledge.sql`
- Modify: `supabase/tests/070-catalogo.sql`
- Modify: `src/infrastructure/supabase/database.types.ts` — `Functions.update_donation_pledge`

**Interfaces:**
- Consumes: `private.has_min_role('admin')`, `donation_pledges`, `donation_items`
- Produces: `update_donation_pledge(p_pledge_id, p_quantity, p_note, p_contact_name, p_contact_phone) → void`

- [ ] **Step 1: Write the pgTAP cases** (they fail until the function exists)

Append to `070-catalogo.sql`. Reuse the existing campaign and the donor `ab710000-0000-4000-8000-0000000000a1` / admin `…0ff`. Create a dedicated item, e.g. `ab700000-0000-4000-8000-0000000000ed`, `needed_quantity = 4`.

Cases:

1. Dueño reserva 1, edita a 2 → `quantity = 2` y `reserved_quantity = 2`.
2. Dueño baja a 1 → `reserved_quantity = 1`.
3. Dueño pide 0 → `cantidad_invalida`.
4. Dueño pide 5 (más que needed) → `sin_disponibilidad`; cantidades no cambian.
5. Dueño manda `contact_phone` → la columna de la reserva no cambia.
6. Dueño cambia solo la nota (misma cantidad) → nota nueva, `reserved_quantity` igual.
7. Admin (`user_role=admin`) corrige nombre y teléfono de una reserva con `user_id` nulo.
8. Admin vacía el nombre de esa → `datos_de_retiro`.
9. Dueño no puede editar una `accepted` → `no_encontrada`.
10. Otro donante no edita la ajena → `sin_permiso`.
11. Dos sesiones piden la última unidad extra: una gana, la otra `sin_disponibilidad` (mismo patrón `dblink` que el claim concurrente más arriba en este archivo).

Look up how existing tests call `throws_ok` / `is` on `claim_donation_item` in this file and copy that style. Do not invent a different assertion helper.

- [ ] **Step 2: Run to verify fail**

Run: `npm run db:verify`

Expected: FAIL — `function public.update_donation_pledge(...) does not exist`. The rest of `070-catalogo.sql` still has to stay green after the function lands.

- [ ] **Step 3: Write the migration**

```sql
create function public.update_donation_pledge(
  p_pledge_id uuid,
  p_quantity integer,
  p_note text default null,
  p_contact_name text default null,
  p_contact_phone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_pledge public.donation_pledges%rowtype;
  v_staff boolean;
  v_delta integer;
  v_note text;
  v_contact_name text;
  v_contact_phone text;
begin
  if v_actor is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'cantidad_invalida' using errcode = '23514';
  end if;

  select * into v_pledge
    from public.donation_pledges
   where id = p_pledge_id;

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  if v_pledge.status is distinct from 'reserved' then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  v_staff := private.has_min_role('admin');

  if v_pledge.user_id is distinct from v_actor and not v_staff then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  v_delta := p_quantity - v_pledge.quantity;

  if v_delta <> 0 then
    update public.donation_items
       set reserved_quantity = reserved_quantity + v_delta
     where id = v_pledge.item_id
       and reserved_quantity + fulfilled_quantity + v_delta <= needed_quantity;

    if not found then
      raise exception 'sin_disponibilidad' using errcode = '23514';
    end if;
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');

  update public.donation_pledges
     set quantity = p_quantity,
         donor_note = v_note
   where id = p_pledge_id
     and status = 'reserved';

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  if v_staff and v_pledge.user_id is null then
    v_contact_name := nullif(btrim(coalesce(p_contact_name, '')), '');
    v_contact_phone := nullif(btrim(coalesce(p_contact_phone, '')), '');

    if v_contact_name is null or v_contact_phone is null then
      raise exception 'datos_de_retiro' using errcode = '23514';
    end if;

    update public.donation_pledges
       set contact_name = v_contact_name,
           contact_phone = v_contact_phone
     where id = p_pledge_id;
  end if;
end;
$$;

revoke all on function public.update_donation_pledge(uuid, integer, text, text, text) from public;
grant execute on function public.update_donation_pledge(uuid, integer, text, text, text) to authenticated;

comment on function public.update_donation_pledge(uuid, integer, text, text, text) is
  'Edita una reserved: dueño cambia cantidad y nota; admin+ también contacto si user_id es nulo.';
```

`expires_at` no se toca. En una de cuenta, contacto no se escribe.

Add to `database.types.ts` `Functions`:

```ts
update_donation_pledge: {
  Args: {
    p_contact_name?: string;
    p_contact_phone?: string;
    p_note?: string;
    p_pledge_id: string;
    p_quantity: number;
  };
  Returns: undefined;
};
```

- [ ] **Step 4: Run pgTAP**

Expected: PASS for the new cases. Existing catalog tests still pass.

- [ ] **Step 5: Commit** — only if asked.

---

### Task 5: Copy

**Files:**
- Modify: `content/schemas/account.ts` — profile keys
- Modify: `content/es/cuenta.json`
- Modify: `content/en/cuenta.json`

**Produces:** labels for the own-pledge edit form.

```ts
editPledge: phrase,
savingPledge: phrase,
pledgeNote: phrase,
pledgeNoteHint: phrase,
```

es:

- `editPledge`: `Guardar cambios`
- `savingPledge`: `Guardando…`
- `pledgeNote`: `Nota para la familia`
- `pledgeNoteHint`: `Si hay algo que el equipo tenga que saber. Es optativa.`

en:

- `editPledge`: `Save changes`
- `savingPledge`: `Saving…`
- `pledgeNote`: `Note for the family`
- `pledgeNoteHint`: `Anything the team should know. Optional.`

Quantity label: reuse `catalog.quantity` (`Cuántas` / the English equivalent) already passed into `OwnPledges`. Do not duplicate.

- [ ] **Step 1: Add schema keys, then JSON.** `content/schema.test.ts` fails if one language misses a key.
- [ ] **Step 2:** `npx vitest run content/schema.test.ts content/account.test.ts` → PASS
- [ ] **Step 3: Commit** — only if asked.

---

### Task 6: `/cuenta` — formulario

**Files:**
- Modify: `app/(es)/catalogo/actions.ts` — `updateOwnPledgeAction`
- Modify: `components/account/own-pledges.tsx`
- Modify: `components/account/own-pledges.test.tsx`
- Create: `components/account/edit-own-pledge.tsx` if `own-pledges.tsx` would pass 300 lines

**Interfaces:**
- Consumes: `canEditPledge`, `updateOwnPledge`, `catalog.quantity`, new copy keys
- Produces: reserved row shows quantity + note + submit + cancel. accepted/fulfilled do not.

- [ ] **Step 1: Write the failing UI tests**

Add to `own-pledges.test.tsx`:

```ts
vi.mock("@/app/(es)/catalogo/actions", () => ({
  cancelOwnPledgeAction: vi.fn(),
  updateOwnPledgeAction: vi.fn(),
}));

it("reserved ofrece cantidad, nota y guardar", () => {
  renderPledges([pledge()], [item({ neededQuantity: 4, remainingQuantity: 3 })]);
  expect(screen.getByLabelText(/^cuántas$/i)).toHaveValue(1);
  expect(screen.getByLabelText(/nota para la familia/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /cancelar esta reserva/i })).toBeInTheDocument();
});

it("accepted no ofrece editar", () => {
  renderPledges([pledge({ status: "accepted" })], [item()]);
  expect(screen.queryByLabelText(/^cuántas$/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /guardar cambios/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run components/account/own-pledges.test.tsx`

Expected: FAIL — no quantity field / no save button.

- [ ] **Step 3: Action**

```ts
export async function updateOwnPledgeAction(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const { updateOwnPledge } =
    await import("@/src/application/accounts/update-own-pledge");
  const quantityRaw = textOf(formData, "cantidad");
  const result = await updateOwnPledge(await getAccountDeps(), {
    pledgeId: textOf(formData, "pledgeId"),
    quantity: Number.parseInt(quantityRaw, 10),
    note: textOf(formData, "nota"),
  });

  if (result.status === "error") {
    redirect(
      `${localizeHref("/cuenta", locale)}?aviso=${encodeURIComponent(result.code)}`,
    );
  }

  revalidatePath(localizeHref("/catalogo", locale), "layout");
  revalidatePath(localizeHref("/cuenta", locale));
  redirect(localizeHref("/cuenta", locale));
}
```

If `cantidad` is not an integer, `updateOwnPledge` already returns `quantityInvalid`. `Number.parseInt` of garbage is `NaN`; the use case must reject `NaN` as `quantityInvalid`.

- [ ] **Step 4: Form in the reserved row**

`canEditPledge(pledge.status)`. Fields: hidden `pledgeId` + `LocaleField`; `TextField` `cantidad` (`inputMode="numeric"`, `defaultValue={String(pledge.quantity)}`, label `catalog.quantity`); `TextField` `nota` (`defaultValue={pledge.donorNote ?? ""}`, label `copy.pledgeNote`). Submit: `SubmitButton` with `PencilIcon`, `copy.editPledge`, pending `copy.savingPledge`. Cancel stays below, `TrashIcon`, danger.

`max` is not a HTML attribute we invent: the base rejects overage. Optional `max` on the input = `pledge.quantity + item.remainingQuantity` when `item` is present.

Icons before the name (ADR-047). `npm run check:iconos` after this task.

- [ ] **Step 5: Tests green**

Run: `npx vitest run components/account/own-pledges.test.tsx`

Expected: PASS. Existing reserved/accepted/fulfilled cases still pass (`accepted` still has no cancel).

- [ ] **Step 6: Commit** — only if asked.

---

### Task 7: `/admin/donaciones` — Editar

**Files:**
- Modify: `app/(es)/admin/(panel)/donaciones/actions.ts` — `updatePledgeAction`
- Modify: `app/(es)/admin/(panel)/donaciones/page.tsx` — if `max-lines` fails, extract the edit `RowAction` to `components/admin/pledge-edit.tsx`
- Create: `components/admin/pledge-edit.test.tsx` (or extend an existing admin donations test if one exists)

**Interfaces:**
- Consumes: `canEditPledge`, `updatePledge`
- Produces: reserved row has **Editar esta reserva**. Phone (`userId === null`) also shows name and phone. accepted/fulfilled/cancelled do not.

- [ ] **Step 1: Action**

Same shape as `cancelPledgeAction`: `getAdminDeps`, `updatePledge(deps, Object.fromEntries(formData), null)`, `revalidateDonationPages`, stay on `/admin/donaciones`. **No mail helper.**

- [ ] **Step 2: UI**

On `PledgeRow`, when `puedeEscribir && canEditPledge(pledge.status)`:

`RowAction` label `Editar esta reserva`. `ActionForm` → `updatePledgeAction`. Hidden `id`. `TextField` cantidad (default `pledge.quantity`). `TextAreaField` nota (default `pledge.donorNote`). If `pledge.userId === null`: `TextField` contactName and contactPhone, required, defaults from the pledge. Submit: `Guardar cambios` with `PencilIcon`.

Do not add Editar on accepted / fulfilled / cancelled.

- [ ] **Step 3: Test**

If the page is a Server Component without a test file, put a small extract (`PledgeEditFields`) in `components/admin/pledge-edit.tsx` and test that:

- reserved + `userId` null → name and phone fields
- reserved + `userId` set → no name/phone fields
- the submit label is `Guardar cambios`

- [ ] **Step 4:** `npx vitest run` on the new test. `npm run check:iconos`.
- [ ] **Step 5: Commit** — only if asked.

---

### Task 8: E2e y docs

**Files:**
- Modify: `e2e/con-datos/catalogo.spec.ts` — or add a focused test next to the existing reserve/cancel case
- Modify: `specs/002-cuentas-y-catalogo-de-donaciones/spec.md` — FR-220
- Modify: `specs/002-cuentas-y-catalogo-de-donaciones/data-model.md` — document the function
- Modify: `specs/002-cuentas-y-catalogo-de-donaciones/contracts/catalogo.md` — add the row for `update_donation_pledge`
- Modify: `specs/002-cuentas-y-catalogo-de-donaciones/contracts/cuentas.md` — one line: Mis donaciones edita cantidad y nota de una `reserved`

- [ ] **Step 1: E2e**

Item with `needed = 3`. Account reserves 1 (`completarTraer` without extra). On `/cuenta`:

```ts
await expect(pagina.getByLabel(/^cuántas$/i)).toHaveValue("1");
await pagina.getByLabel(/^cuántas$/i).fill("2");
await pagina.getByRole("button", { name: /guardar cambios/i }).click();
await expect(pagina.getByText(/2 /i)).toBeVisible();
```

Then cancel as today if this is folded into the existing conflict test; otherwise keep that test untouched and add a new one so a failure here does not hide the race.

- [ ] **Step 2: FR-220**

Replace the current sentence so it also says the owner MAY edit quantity and note of a `reserved` own pledge. MUST NOT edit `accepted` or `fulfilled`.

- [ ] **Step 3: data-model + contracts**

Document `update_donation_pledge` next to `cancel_donation_pledge`. Error table: `sin_sesion`, `sin_permiso`, `no_encontrada`, `cantidad_invalida`, `sin_disponibilidad`, `datos_de_retiro`.

- [ ] **Step 4: Commit** — only if asked.

---

## Self-review

| Spec | Task |
|---|---|
| Solo `reserved` | 1, 4, 6, 7 |
| Dueño: cantidad + nota | 3, 4, 6 |
| Admin: + contacto si teléfono | 3, 4, 7 |
| Cantidad > 0; no sobrevende; delta 0 no mueve | 4 |
| Sin correo nuevo; rastro `pledge.updated` | 2, 3, 7 |
| Ficha / muro / listado no se tocan | none of the tasks touch them |
| Errores con códigos existentes | 3, 4 |
| E2e reservar 1 → 2 | 8 |
| FR-220 | 8 |
