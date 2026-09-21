# Donantes fuera de la página — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work on `main`. TDD. Do not commit unless the user asks.

**Goal:** El owner crea una cuenta del público para quien donó por fuera, con mail inventado si hace falta, y le carga plata y material en una ficha.

**Architecture:** Mail inventado en dominio puro. Auth Admin crea la persona y emite el `invite`. Un RPC `provision_donor_account` inserta el perfil ya `approved`. `contributions.user_id` ata la plata. Un RPC `record_donor_arrival` inserta la reserva `fulfilled`. La UI vive en `/admin/donantes` y `/admin/donantes/[id]`.

**Tech Stack:** Postgres (security definer), Supabase Auth Admin, casos de uso de `src/application/admin`, Next.js App Router, vitest + pgTAP + Playwright.

**Spec:** `docs/superpowers/specs/2026-09-20-donantes-fuera-de-la-pagina-design.md`

## Global Constraints

- Se trabaja sobre `main`. Sin ramas ni PRs.
- Un commit por cambio lógico, y sólo si el usuario lo pide.
- `typescript` mayor 6, `eslint` mayor 9. Dependencias exactas.
- `src/domain/**` sin React, Next, Supabase ni I/O.
- `security definer` con `search_path = ''`. Sin `for all`. Sin policy a `authenticated` sin rol o dueño.
- Icono antes del nombre en cada botón con caja y en WhatsApp (`check:iconos`, ADR-047).
- El correo no se copia a `donor_profiles`.
- Cuenta creada por admin/owner nace `approved`. Quien se anota sola sigue `pending` (ADR-033 enmendado).
- Sin material suelto: el ítem tiene que existir en el catálogo.
- Aportes no pide elegir persona.
- TDD: test en rojo, visto fallar, después el código.

## File map

| Unidad | Archivos | Responsabilidad |
|---|---|---|
| Mail inventado | `src/domain/provisioned-email.ts` + test | Local y dominio `@lacasadenorma.com` |
| Perfil / aporte | `src/domain/entities/donor.ts`, `contribution.ts`, `audit.ts`, `errors.ts` | `contactPhone`, `userId`, acciones, `CatalogNoRoomError` |
| Puertos | `src/domain/ports/admin.ts`, `donations.ts`, `email.ts` | `provisionProfile`, `getAccount`, Auth invite, `recordArrival`, `account.invite` |
| Alta | `src/application/admin/donors.ts` + test, `provision-auth.ts` | Crear usuario, perfil, enlace, correo |
| Plata | `src/application/admin/contributions.ts` + test | `userId` opcional |
| Material | `src/application/admin/pledges.ts` + test | `recordDonorArrival` |
| Auth | `src/infrastructure/supabase/provision-donor.ts` | `createUser` + `generateLink({ type: "invite" })` |
| SQL | migración nueva + `supabase/tests/082-donantes-provision.sql` | Columna, RPCs, RLS |
| UI | `app/.../donantes/page.tsx`, `actions.ts`, `[id]/page.tsx`, `components/admin/donor-invite-share.tsx` | Formulario, ficha, copiar, WhatsApp |
| Correos | `content/es/emails.json`, `content/en/emails.json`, schemas, `identity.ts` | `accountInvite` |
| Docs | ADR-033, runbook, security.md, data-model | Enmienda y operación |

---

### Task 1: Mail inventado

**Files:**
- Create: `src/domain/provisioned-email.ts`
- Create: `src/domain/provisioned-email.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
export const INVENTED_EMAIL_DOMAIN = "lacasadenorma.com";
export function localPartFromName(name: string): string;
export function inventedEmail(
  name: string,
  taken?: ReadonlySet<string>,
): string;
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { inventedEmail, localPartFromName } from "./provisioned-email";

describe("localPartFromName", () => {
  it("pliega tildes y espacios", () => {
    expect(localPartFromName("María Pérez")).toBe("maria.perez");
  });

  it("si no queda nada, alguien", () => {
    expect(localPartFromName("…")).toBe("alguien");
    expect(localPartFromName("   ")).toBe("alguien");
  });
});

describe("inventedEmail", () => {
  it("usa @lacasadenorma.com", () => {
    expect(inventedEmail("María Pérez")).toBe("maria.perez@lacasadenorma.com");
  });

  it("si está tomado, suma -2", () => {
    expect(
      inventedEmail("María Pérez", new Set(["maria.perez@lacasadenorma.com"])),
    ).toBe("maria.perez-2@lacasadenorma.com");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/provisioned-email.test.ts`

Expected: FAIL — cannot find module `./provisioned-email`

- [ ] **Step 3: Write minimal implementation**

```ts
export const INVENTED_EMAIL_DOMAIN = "lacasadenorma.com";

export function localPartFromName(name: string): string {
  const folded = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 48);

  return folded.length === 0 ? "alguien" : folded;
}

export function inventedEmail(
  name: string,
  taken: ReadonlySet<string> = new Set(),
): string {
  const local = localPartFromName(name);
  let candidate = `${local}@${INVENTED_EMAIL_DOMAIN}`;
  let n = 2;

  while (taken.has(candidate)) {
    candidate = `${local}-${String(n)}@${INVENTED_EMAIL_DOMAIN}`;
    n += 1;
  }

  return candidate;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/provisioned-email.test.ts`

Expected: PASS

---

### Task 2: Tipos de dominio, puertos y auditoría

**Files:**
- Modify: `src/domain/entities/donor.ts` — `DonorAccountAdminRecord.contactPhone: string | null`
- Modify: `src/domain/entities/contribution.ts` — `ContributionAdminRecord.userId: string | null`
- Modify: `src/domain/entities/audit.ts` — `"donor.provisioned": "cargó una cuenta de quien donó por fuera"`, `"pledge.recorded": "anotó una entrega ya llegada"`
- Modify: `src/domain/errors.ts` + `errors.test.ts` — `CatalogNoRoomError`
- Modify: `src/domain/ports/email.ts` — `"account.invite"` en `IDENTITY_EMAIL_KINDS`
- Modify: `src/application/admin/core.ts` — mapear `CatalogNoRoomError` a `fieldErrors.quantity`

Los métodos nuevos de puerto van en la task que los implementa (3, 5 y 6), no acá: si se agregan ahora, `tsc` se rompe hasta la infra.

**Interfaces:**
- Consumes: Task 1
- Produces: `CatalogNoRoomError`, `contactPhone`, `ContributionAdminRecord.userId`, `donor.provisioned`, `pledge.recorded`, `account.invite`

```ts
// AdminDonorPort
getAccount(userId: string): Promise<DonorAccountAdminRecord | null>;
provisionProfile(input: {
  userId: string;
  displayName: string;
  phone: string | null;
}): Promise<void>;

// más un puerto de Auth (no es el gateway; va como colaborador del caso de uso):
export interface DonorAuthPort {
  createConfirmedUser(email: string): Promise<
    { readonly status: "created"; readonly userId: string } |
    { readonly status: "exists"; readonly userId: string }
  >;
  inviteUrl(input: { email: string; locale: "es" | "en" }): Promise<string>;
  listTakenInventedEmails(localPrefix: string): Promise<readonly string[]>;
}

// AdminContributionPort.recordContribution + userId: string | null
// AdminDonationsPort.recordArrival(input: {
//   userId: string; itemId: string; quantity: number; displayName: string | null;
// }): Promise<string>
```

- [ ] **Step 1: Write the failing test**

En `src/domain/errors.test.ts`, agregar:

```ts
it("CatalogNoRoomError habla del cupo", () => {
  expect(new CatalogNoRoomError().message).toBe(
    "Ese ítem no tiene cupo para esa cantidad.",
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/domain/errors.test.ts`

Expected: FAIL — `CatalogNoRoomError` is not exported

- [ ] **Step 3: Implement types and the error**

```ts
export class CatalogNoRoomError extends DomainError {
  constructor() {
    super("Ese ítem no tiene cupo para esa cantidad.");
    this.name = "CatalogNoRoomError";
  }
}
```

En `perform` (`core.ts`), junto a `CatalogOversubscribedError`:

```ts
if (error instanceof CatalogNoRoomError) {
  return {
    status: "invalid",
    message: error.message,
    fieldErrors: { quantity: error.message },
  };
}
```

Actualizar `DonorAccountAdminRecord.contactPhone`, `ContributionAdminRecord.userId` (los ports de lectura los rellenan en Task 5; hasta entonces el typecheck de esos ports falla — agregar el campo al `map` en la misma task 5). `AUDIT_ACTION_LABELS` sí va acá.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/domain/errors.test.ts src/application/admin/donors.test.ts src/application/admin/contributions.test.ts src/application/admin/pledges.test.ts`

Expected: PASS (los existentes). Si el fake quedó incompleto, typecheck lo dice.

Run: `npx tsc --noEmit --pretty false` no: usar el typecheck del repo después de `next typegen` sólo al final de cada task de infra. Acá: `npx vitest run src/domain/errors.test.ts` PASS.

---

### Task 3: Provisionar cuenta (aplicación)

**Files:**
- Modify: `src/application/admin/donors.ts`
- Modify: `src/application/admin/donors.test.ts`
- Modify: `src/application/admin/index.ts` — exportar `provisionDonorAccount`, `regenerateDonorInvite`
- Create: `src/infrastructure/supabase/provision-donor.ts` (el puerto Auth; el test lo fakesa)

**Interfaces:**
- Consumes: `inventedEmail`, `DonorAuthPort`, `provisionProfile`
- Produces:

```ts
export async function provisionDonorAccount(
  deps: AdminDeps,
  input: unknown,
  auth: DonorAuthPort,
  mail: ProvisionMail | null,
): Promise<AdminResult<ProvisionedDonor>>;

export interface ProvisionedDonor {
  readonly userId: string;
  readonly email: string;
  readonly inviteUrl: string;
  readonly invented: boolean;
  readonly alreadyExisted: boolean;
}

export async function regenerateDonorInvite(
  deps: AdminDeps,
  input: unknown,
  auth: DonorAuthPort,
): Promise<AdminResult<{ inviteUrl: string }>>;
```

`ProvisionMail` es como `ReviewAccountMail` pero `kind: "account.invite"` y sólo se llama si `invented === false`.

- [ ] **Step 1: Write the failing tests**

En `donors.test.ts`:

```ts
it("sin mail inventa @lacasadenorma.com, habilita y no manda correo", async () => {
  const { deps: admin, fake } = deps("admin");
  const auth = fakeAuth({ userId: CUENTA });
  const aviso = inviteMail({});
  const result = await provisionDonorAccount(
    admin,
    { displayName: "María Pérez", email: "", phone: "11 1234-5678" },
    auth.port,
    aviso.mail,
  );

  expect(result.status).toBe("ok");
  if (result.status !== "ok") return;
  expect(result.value.email).toBe("maria.perez@lacasadenorma.com");
  expect(result.value.invented).toBe(true);
  expect(result.value.alreadyExisted).toBe(false);
  expect(fake.calls.find((c) => c.name === "provisionProfile")).toMatchObject({
    input: { userId: CUENTA, displayName: "María Pérez", phone: "11 1234-5678" },
  });
  expect(fake.audit[0]).toMatchObject({
    action: "donor.provisioned",
    diff: { invented: true },
  });
  expect(aviso.sent).toEqual([]);
});

it("con mail real manda account.invite", async () => {
  const { deps: admin } = deps("admin");
  const auth = fakeAuth({ userId: CUENTA });
  const aviso = inviteMail({});
  const result = await provisionDonorAccount(
    admin,
    { displayName: "Ana", email: "ana@ejemplo.com" },
    auth.port,
    aviso.mail,
  );

  expect(result.status).toBe("ok");
  expect(aviso.sent).toEqual([{ kind: "account.invite", to: "ana@ejemplo.com" }]);
});

it("mail repetido no crea otra y marca alreadyExisted", async () => {
  const { deps: admin } = deps("admin");
  const auth = fakeAuth({ userId: CUENTA, exists: true });
  const result = await provisionDonorAccount(
    admin,
    { displayName: "Ana", email: "ana@ejemplo.com" },
    auth.port,
    null,
  );

  expect(result.status).toBe("ok");
  if (result.status !== "ok") return;
  expect(result.value.alreadyExisted).toBe(true);
  expect(result.value.userId).toBe(CUENTA);
});

it("editor no provisiona", async () => {
  const { deps: editor } = deps("editor");
  const result = await provisionDonorAccount(
    editor,
    { displayName: "Ana" },
    fakeAuth({ userId: CUENTA }).port,
    null,
  );

  expect(result.status).toBe("rejected");
});
```

Helpers en el mismo test:

```ts
function fakeAuth(options: { userId: string; exists?: boolean }) {
  const port: DonorAuthPort = {
    createConfirmedUser: async () =>
      options.exists === true
        ? { status: "exists", userId: options.userId }
        : { status: "created", userId: options.userId },
    inviteUrl: async () => "https://lacasadenorma.example/cuenta/confirmar?token_hash=abc&type=invite",
    listTakenInventedEmails: async () => [],
  };

  return { port };
}

function inviteMail(options: { failSend?: Error }) {
  const sent: { kind: string; to: string }[] = [];
  const mail: ProvisionMail = {
    sender: {
      send: async (kind, message) => {
        if (options.failSend !== undefined) throw options.failSend;
        sent.push({ kind, to: message.to });
        return { status: "sent", providerId: "re_test" };
      },
    },
    siteUrl: "https://lacasadenorma.example",
    record: async () => undefined,
  };

  return { sent, mail };
}
```

En Task 3, agregar a `AdminDonorPort.provisionProfile` y `getAccount`, y al fake, **en el mismo cambio** que `donors.ts`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/application/admin/donors.test.ts`

Expected: FAIL — `provisionDonorAccount` is not exported

- [ ] **Step 3: Implement the use case**

Esquema Zod: `displayName` texto 1–80, `email` opcional (vacío → inventar), `phone` opcional. Permiso `donaciones.escribir`.

Algoritmo:

1. Si `email` vacío: `listTakenInventedEmails(localPartFromName(name))` y `inventedEmail(name, set)`.
2. `createConfirmedUser(email)`.
3. Si `exists` y el owner escribió el mail: devolver `ok` con `alreadyExisted: true`, `inviteUrl: ""` (la UI manda a la ficha; no se re-invita acá).
4. Si `exists` e inventado: no debería pasar si `listTaken` funcionó; si pasa, reintentar con `-n`.
5. `provisionProfile`. `inviteUrl`. Auditoría `donor.provisioned` con `{ invented }` — nunca el mail.
6. Si no inventó y `mail !== null`, mandar `account.invite` **después**. Si el correo falla, la cuenta ya está (como `reviewDonorAccount`).

`regenerateDonorInvite`: input `{ userId, email }` (el correo lo lee el action con `contactOf`). `generateLink` invite. Auditoría no: no muta la ficha. O sí, `donor.provisioned` otra vez es mentira. Sin auditoría en regenerar: no cambia datos. El spec no pide rastro del re-invite.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/application/admin/donors.test.ts`

Expected: PASS

---

### Task 4: Correo `account.invite`

**Files:**
- Modify: `content/schemas/emails.ts` — `accountInvite: message`
- Modify: `content/es/emails.json` y `content/en/emails.json`
- Modify: `content/emails.test.ts` — sumar `accountInvite` a `DONANTE`
- Modify: `src/application/emails/identity.ts` — `"account.invite": "accountInvite"`
- Modify: `src/application/emails/identity.test.ts` — un caso que el subject no tenga `{link}` suelto
- Modify: `content/schema.test.ts` si lista las claves a mano

**Copy ES (cuerpo):**

```json
"accountInvite": {
  "subject": "Tu cuenta en La Casa de Norma",
  "preheader": "El equipo te dejó una cuenta lista. El enlace vence.",
  "body": [
    "Quien coordina la reconstrucción de la casa de Norma te dejó una cuenta en el sitio. Abrí el enlace para entrar, ver lo anotado a tu nombre y, si querés, anotarte a traer algo más.",
    "El enlace vence. Si no llega, pedí otro a quien te lo mandó.",
    "Si no fuiste vos, ignorá este correo."
  ],
  "action": "Entrar a tu cuenta",
  "why": "Recibís este correo porque el equipo cargó esta dirección al anotar una donación en el sitio de la reconstrucción de la casa de Norma."
}
```

EN equivalente, mismo `{link}` (cero marcas extra).

- [ ] **Step 1: Write the failing test** — identity.test: `buildIdentityEmail("account.invite", HECHOS)` y `expect(message.subject).toMatch(/cuenta/i)`
- [ ] **Step 2: Run** — FAIL (kind not in union / missing copy)
- [ ] **Step 3: Add schema, JSON, mapping**
- [ ] **Step 4: Run** `npx vitest run src/application/emails/identity.test.ts content/emails.test.ts content/schema.test.ts` — PASS

---

### Task 5: Postgres — perfil, aporte atado, provisión y llegada

**Files:**
- Create: vía `npx supabase migration new provision_external_donor` (no inventar el timestamp)
- Create: `supabase/tests/082-donantes-provision.sql`
- Modify: `src/infrastructure/supabase/database.types.ts` después de aplicar
- Modify: ports de infra: `donors-port.ts`, `contributions-port.ts`, `pledges-port.ts`, `provision-donor.ts`
- Modify: `src/infrastructure/supabase/admin/columns.ts` si lista columnas de aportes

**SQL a escribir en la migración** (completo; `search_path = ''`; revoke + grant a `authenticated`):

```sql
alter table public.donor_profiles
  add column contact_phone text;

alter table public.donor_profiles
  add constraint donor_profiles_contact_phone_not_blank
    check (contact_phone is null or length(btrim(contact_phone)) > 0);

comment on column public.donor_profiles.contact_phone is
  'Teléfono de coordinación, optativo. Lo carga el equipo al crear la cuenta.';

alter table public.contributions
  add column user_id uuid references auth.users (id) on delete set null;

create index contributions_user_idx on public.contributions (user_id);

comment on column public.contributions.user_id is
  'Persona a la que se ata el aporte. Nulo en los de antes y en Aportes sin ficha.';

create function public.provision_donor_account(
  p_user_id uuid,
  p_display_name text,
  p_phone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_name text := nullif(btrim(p_display_name), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  if v_actor is null or not private.has_min_role('admin') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'Falta el nombre.' using errcode = '23514';
  end if;

  insert into public.donor_profiles (
    id, display_name, locale, approval_status,
    reviewed_at, reviewed_by, contact_phone
  ) values (
    p_user_id, v_name, 'es', 'approved', now(), v_actor, v_phone
  );
end;
$$;

create function public.record_donor_arrival(
  p_user_id uuid,
  p_item_id uuid,
  p_quantity integer,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_id uuid;
begin
  if v_actor is null or not private.has_min_role('admin') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'cantidad_invalida' using errcode = '23514';
  end if;

  update public.donation_items
     set fulfilled_quantity = fulfilled_quantity + p_quantity
   where id = p_item_id
     and published_at is not null
     and reserved_quantity + fulfilled_quantity + p_quantity <= needed_quantity;

  if not found then
    raise exception 'sin_cupo' using errcode = 'P0001';
  end if;

  insert into public.donation_pledges (
    item_id, user_id, quantity, status,
    is_anonymous, donor_display_name, cover_channel,
    expires_at, accepted_at, fulfilled_at
  ) values (
    p_item_id, p_user_id, p_quantity, 'fulfilled',
    v_name is null, v_name, 'bring',
    now(), now(), now()
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.provision_donor_account(uuid, text, text) from public;
grant execute on function public.provision_donor_account(uuid, text, text) to authenticated;
revoke all on function public.record_donor_arrival(uuid, uuid, integer, text) from public;
grant execute on function public.record_donor_arrival(uuid, uuid, integer, text) to authenticated;
```

El insert autenticado de `donor_profiles` **sigue** exigiendo `pending`. Esta función es la única vía `approved` al nacer.

`record_donor_arrival` copia el chequeo de cupo de `claim_donation_item`. Nadie tiene INSERT directo sobre `donation_pledges`.

- [ ] **Step 1: pgTAP en rojo**

En `082-donantes-provision.sql`, con las cuentas de `030-matriz-de-permisos.sql` (mismos UUIDs de fixture de test; leer ese archivo y reutilizar `set local role` / `set request.jwt.claim`):

- editor llama `provision_donor_account` → `42501`
- donante también
- admin provisiona → fila `approved` con `reviewed_by`
- insert autenticado `approval_status = 'approved'` sigue negado
- admin `record_donor_arrival` con qty que no entra → error
- admin con cupo → `fulfilled` y `fulfilled_quantity` suma
- aporte con `user_id` se inserta; `anon` no lee `contributions`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx supabase test db supabase/tests/082-donantes-provision.sql` (o el comando que use `npm run db:verify` para un archivo). Si la migración no existe, el test falla por función inexistente.

- [ ] **Step 3: Write the migration and apply**

Run: `npx supabase migration new provision_external_donor`  
Pegar el SQL. Aplicar con el flujo del repo (`supabase db reset` de `db:verify` o `db push --local`). Regenerar `database.types.ts` como el resto de migraciones de este repo.

Implementar:

- `provision-donor.ts`: `createAuthAdminClient()`, `auth.admin.createUser({ email, email_confirm: true, password: random 32 bytes })`, on `email_exists` → `getUserByEmail` / list y `{ status: "exists", userId }`. `generateLink({ type: "invite", email })` → `confirmationLink(siteUrl, locale, hashed_token, "invite")`. `listTakenInventedEmails`: `auth.admin.listUsers` filtrando `@lacasadenorma.com` que empiecen con el local (página de a 50 está bien: hay pocos).
- `donors-port`: `contact_phone` en COLUMNS y `mapAccount`; `getAccount`; `provisionProfile` → rpc.
- `contributions-port`: persistir y leer `user_id`.
- `pledges-port`: `recordArrival` → rpc; si error `sin_cupo` tirar `CatalogNoRoomError`.

- [ ] **Step 4: Run pgTAP**

Expected: PASS

---

### Task 6: Plata y material (aplicación)

**Files:**
- Modify: `src/application/admin/contributions.ts` + test — `userId: optionalUuid` en el schema, pasarlo al puerto
- Modify: `src/application/admin/pledges.ts` + test — `recordDonorArrival`
- Modify: `src/application/admin/index.ts`

**Interfaces:**
- Consumes: `recordContribution` + `userId`, `recordArrival`, `CatalogNoRoomError`
- Produces: `recordDonorArrival(deps, input) → AdminResult<{ id: string }>`

- [ ] **Step 1: Failing tests**

```ts
it("ata el aporte a la persona sin copiar el userId a la auditoría", async () => {
  const { deps: admin, fake } = deps("admin");
  await recordContribution(admin, {
    campaignId: CAMPAIGN,
    amount: "10.000",
    currency: "ARS",
    receivedAt: "2026-09-01",
    userId: CUENTA,
  });
  expect(fake.calls[0]).toMatchObject({ input: { userId: CUENTA } });
  expect(JSON.stringify(fake.audit)).not.toContain(CUENTA);
});

it("anota una llegada directa", async () => {
  const { deps: admin, fake } = deps("admin");
  const result = await recordDonorArrival(admin, {
    userId: CUENTA,
    itemId: ITEM,
    quantity: "2",
    displayName: "María",
  });
  expect(result.status).toBe("ok");
  expect(fake.calls[0]).toMatchObject({
    name: "recordArrival",
    input: { userId: CUENTA, quantity: 2, displayName: "María" },
  });
  expect(fake.audit[0]).toMatchObject({ action: "pledge.recorded" });
});

it("editor no anota llegada", async () => {
  const { deps: editor } = deps("editor");
  expect((await recordDonorArrival(editor, { userId: CUENTA, itemId: ITEM, quantity: "1" })).status)
    .toBe("rejected");
});
```

Usar los UUIDs ya definidos en `admin-test-helpers` / `pledges.test.ts`.

- [ ] **Step 2: Run — FAIL** (`recordDonorArrival` missing; `userId` not passed)
- [ ] **Step 3: Minimal implementation** — `finanzas.escribir` para el aporte (igual que hoy); `donaciones.escribir` para la llegada. Quantity: entero > 0. `displayName` opcional.
- [ ] **Step 4: Run** `npx vitest run src/application/admin/contributions.test.ts src/application/admin/pledges.test.ts` — PASS

---

### Task 7: UI — alta, ficha, enlace y WhatsApp

**Files:**
- Modify: `app/(es)/admin/(panel)/donantes/page.tsx` — panel «Cargar a alguien que donó por fuera» **arriba** de Pendientes
- Modify: `app/(es)/admin/(panel)/donantes/actions.ts` — `provisionDonorAction`, `regenerateInviteAction`, `recordDonorContributionAction`, `recordDonorArrivalAction`
- Create: `app/(es)/admin/(panel)/donantes/[id]/page.tsx`
- Create: `components/admin/donor-invite-share.tsx` + `donor-invite-share.test.tsx`
- Modify: `components/admin/nav-bar.test.tsx` / e2e nav si listan secciones (la ficha no es ítem de menú)
- Habilitadas: el título de cada `Record` es un enlace a `/admin/donantes/{userId}`

Si `createAuthAdminClient() === null`, no renderizar el formulario de alta.

**Alta — campos:** Nombre, Correo (`type="email"`), Teléfono. Submit **Crear la cuenta** con marca (persona / plus: el icono que ya use el admin para donantes; si no hay, `IdentifyingMark` + icono de persona de `icons.tsx`). `pendingLabel="Creando…"`.

Tras `ok` y `!alreadyExisted`: mostrar `DonorInviteShare` con `email`, `inviteUrl`, `phone`.  
Tras `ok` y `alreadyExisted`: mensaje + enlace a `/admin/donantes/{userId}`.

**Ficha:** `requirePermission("donaciones.leer")`. 404 si `getAccount` es null.  
Arriba: nombre, mail (`contactOf` / `account.email`), teléfono, `DonorInviteShare` + **Volver a generar**.  
Plata: filtrar `listContributions` por `userId`. Formulario como Aportes + `HiddenValue userId` + nombre precargado. Permiso escribir: `finanzas.escribir`.  
Material: pledges de esa persona. Select de ítems con `remaining > 0` (`listItems`). Cantidad. Aparecer + nombre. `recordDonorArrivalAction`.

**DonorInviteShare:** botón copiar el enlace (`ICON_ACTION` copiar). Si hay teléfono y `whatsappHrefFor(phone)`: `<a href={wa.me + text=inviteUrl}>` con `<BrandLabel id="whatsapp">WhatsApp</BrandLabel>`. Test: el HTML tiene el logo/marca y `1.15em`.

- [ ] **Step 1: Test de invite-share en rojo** — render, copy link presente, WhatsApp con marca
- [ ] **Step 2: Run FAIL**
- [ ] **Step 3: Componente + pages + actions**
- [ ] **Step 4:** `npx vitest run components/admin/donor-invite-share.test.tsx` PASS. `npm run check:iconos` PASS.

---

### Task 8: E2E, docs, types

**Files:**
- Create: `e2e/con-datos/donantes-provision.spec.ts`
- Modify: `docs/adr/033-aprobacion-de-cuentas.md` — párrafo: cuenta creada por admin/owner nace `approved`
- Modify: `docs/runbook.md` §5 — las personas que donan por fuera se cargan en `/admin/donantes`; el primer owner sigue siendo SQL
- Modify: `docs/security.md` — esto no abre pantalla de `roles.escribir`
- Modify: `specs/002-cuentas-y-catalogo-de-donaciones/data-model.md` — `contact_phone`, `contributions.user_id`, las dos funciones
- Modify: `src/infrastructure/supabase/database.types.ts` si la task 5 no lo cerró

**E2E:**

```ts
test("owner carga a quien donó por fuera, sin mail", async ({ page }) => {
  await entrar(page, "owner");
  await page.goto("/admin/donantes");
  await page.getByLabel("Nombre").fill("Vecina de la costa");
  await page.getByRole("button", { name: /crear la cuenta/i }).click();
  await expect(page.getByText(/@lacasadenorma\.com/)).toBeVisible();
  await expect(page.getByRole("button", { name: /copiar/i })).toBeVisible();
});
```

Más: abrir la ficha, registrar un aporte (monto chico, fecha de hoy), anotar un ítem del catálogo si el fixture tiene uno con cupo; `/admin` como esa persona no existe (no hay sesión de ella). Editor no ve «Crear la cuenta».

Si el formulario no está (sin secreta), el test tiene que fallar en con-datos: la clave es parte del harness.

- [ ] **Step 1: E2E en rojo** (feature missing)
- [ ] **Step 2: Docs**
- [ ] **Step 3: `npm run verify`** — verde antes de pedir commit
- [ ] **Step 4: Commit sólo si el usuario lo pide**, un commit lógico:

```
Load people who donated off-site as ready public accounts
```

---

## Spec coverage

| Spec | Task |
|---|---|
| Formulario en Donantes, nombre/mail/teléfono | 7 |
| Mail inventado `local@lacasadenorma.com`, choque `-2` | 1, 3 |
| Cuenta habilitada, correo confirmado, clave oculta | 3, 5 |
| Invite + `/cuenta/confirmar`; mail real sí, inventado no | 3, 4, 7 |
| WhatsApp con marca | 7 |
| Ficha plata + material ya entregado | 6, 7 |
| `user_id` en aportes, viejos nulos | 2, 5, 6 |
| `record_donor_arrival` fulfilled, cupo | 5, 6 |
| Sin ítem → primero Catálogo | 7 (select sólo del catálogo) |
| Mail repetido → ficha existente | 3, 7 |
| Sin Auth secret → no se ofrece el alta | 7 |
| Volver a generar | 3, 7 |
| ADR-033, runbook, security, no roles.escribir | 8 |
| Tests dominio / caso de uso / pgTAP / e2e | 1, 3, 5, 6, 8 |
| `locale = es`, aparecer se tilda por carga | 5, 7 |

## Type consistency

- `provisionDonorAccount` / `ProvisionedDonor` / `DonorAuthPort` — Tasks 2–3
- `provisionProfile({ userId, displayName, phone })` — Tasks 2, 3, 5
- `recordArrival({ userId, itemId, quantity, displayName })` — Tasks 2, 5, 6
- `recordContribution` + `userId: string | null` — Tasks 2, 5, 6
- `account.invite` / `accountInvite` — Tasks 2, 4
- `CatalogNoRoomError` → `fieldErrors.quantity` — Tasks 2, 5, 6
- `donor.provisioned`, `pledge.recorded` — Tasks 2, 3, 6
