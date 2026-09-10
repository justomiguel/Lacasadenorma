# Fase 1 — Modelo de datos

Diseñado para auditoría, no para conveniencia. Dos decisiones lo gobiernan:

1. **Todo monto es un entero en la unidad mínima, con su moneda al lado.** Nunca `float`, nunca un
   monto sin moneda. Sumar montos de monedas distintas es un error de tipos en el dominio, no un
   bug de runtime.
2. **Nada financiero se borra.** Se anula con `voided_at` y `void_reason`. Un historial que puede
   desaparecer no es un historial.

---

## 1. Entidades del primer release

```
campaigns
   ├── budget_items      (rubros de obra con monto estimado)
   ├── contributions     (aportes conciliados; NO públicos individualmente)
   ├── expenses ──── expense_receipts   (archivo en bucket privado)
   ├── milestones        (hitos con estado)
   ├── updates ──── update_media        (novedades publicables)
   └── payment_methods   (cuentas AR / CL / US, extensible)

people                   (Norma y figuras del proyecto)
media                    (fotografías; alt obligatorio)
user_roles               (owner / admin / editor / auditor)
audit_log                (append-only)
```

Diferidas hasta que existan: `programs`, `courses`, `registrations` (Riacho Conecta), `documents`,
`donors`. El modelo deja lugar para ellas sin condicionar nada hoy.

---

## 2. Tablas

Convenciones: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null
default now()`, `updated_at timestamptz` mantenido por trigger. Todo monto es
`amount_minor bigint` + `currency char(3)`. `published_at timestamptz` nulo significa borrador: el
público no lo ve.

### `campaigns`

| Columna | Tipo | Notas |
|---|---|---|
| `slug` | `citext unique` | `casa-de-norma` |
| `title`, `summary` | `text` | |
| `goal_amount_minor` | `bigint` nullable | **Nulo = no verificado.** La UI omite la barra de progreso |
| `goal_currency` | `char(3)` | `ARS` |
| `status` | enum `campaign_status` | `draft` \| `active` \| `paused` \| `completed` |
| `reconciled_at` | `timestamptz` nullable | Última conciliación bancaria. Se muestra al público (FR-010) |
| `published_at` | `timestamptz` nullable | |

**Invariante**: `goal_amount_minor` nulo o `> 0`. Nunca `0`, que sería ambiguo entre "no hay
objetivo" y "el objetivo es cero".

### `budget_items` — en qué se va a usar el dinero (FR-017)

| Columna | Tipo | Notas |
|---|---|---|
| `campaign_id` | `uuid` → `campaigns` | |
| `title` | `text` | "Techo y cabriadas" |
| `description` | `text` nullable | |
| `estimated_amount_minor` | `bigint` **nullable** | Nulo = presupuesto no cotizado todavía |
| `currency` | `char(3)` | |
| `sort_order` | `int` | Orden editorial, no alfabético |
| `published_at` | `timestamptz` nullable | |

### `contributions` — aportes recibidos

| Columna | Tipo | Notas |
|---|---|---|
| `campaign_id` | `uuid` | |
| `amount_minor`, `currency` | | |
| `received_at` | `date` | |
| `payment_method_id` | `uuid` nullable → `payment_methods` | Por dónde entró |
| `source_note` | `text` nullable | Referencia interna de conciliación. **Nunca pública** |
| `is_anonymous` | `boolean not null default true` | |
| `contributor_display_name` | `text` nullable | Sólo con consentimiento explícito. No se usa en esta versión |
| `voided_at`, `void_reason` | | |
| `recorded_by` | `uuid` → `auth.users` | |

**Invariantes**: `amount_minor > 0`; `voided_at` no nulo implica `void_reason` no nulo.

### `expenses` — gastos ejecutados (públicos)

| Columna | Tipo | Notas |
|---|---|---|
| `campaign_id` | `uuid` | |
| `budget_item_id` | `uuid` nullable → `budget_items` | Permite medir % ejecutado por rubro |
| `amount_minor`, `currency` | | |
| `spent_at` | `date` | |
| `concept` | `text` | Lo que se compró o pagó, en lenguaje llano |
| `category` | enum `expense_category` | `materiales` \| `mano_de_obra` \| `servicios` \| `transporte` \| `herramientas` \| `otros` |
| `supplier` | `text` nullable | |
| `voided_at`, `void_reason` | | |
| `published_at` | `timestamptz` nullable | |
| `recorded_by` | `uuid` | |

### `expense_receipts` — comprobantes

| Columna | Tipo | Notas |
|---|---|---|
| `expense_id` | `uuid` → `expenses` | |
| `storage_path` | `text` | Ruta en el bucket **privado** `comprobantes` |
| `file_name`, `mime_type`, `size_bytes` | | |
| `uploaded_by` | `uuid` | |

**Regla de visibilidad (FR-013)**: el público puede saber **que existe** un comprobante; nunca
obtener el archivo. La UI pública lee un contador derivado, no las filas.

### `milestones` — avance

| Columna | Tipo | Notas |
|---|---|---|
| `campaign_id`, `title`, `description` | | |
| `status` | enum `milestone_status` | `pendiente` \| `en_curso` \| `completado` |
| `happened_on` | `date` nullable | Nulo mientras esté pendiente |
| `sort_order`, `published_at` | | |

### `updates` y `update_media` — novedades

| Columna | Tipo | Notas |
|---|---|---|
| `slug` | `citext unique` | Para compartir la novedad sola (FR-027) |
| `title`, `body` | `text` | `body` en Markdown restringido, sin HTML crudo |
| `published_at` | `timestamptz` nullable | |
| `author_id` | `uuid` | |

`update_media` relaciona `update_id` con `media_id` y aporta `sort_order`.

### `media` — fotografías

| Columna | Tipo | Notas |
|---|---|---|
| `storage_path` | `text` | Bucket **público** `fotos` |
| `alt_text` | `text not null` | **Obligatorio a nivel de esquema** (FR-024). No puede quedar vacío |
| `caption`, `credit` | `text` nullable | |
| `width`, `height` | `int` | Necesarios para evitar CLS (principio VII) |
| `taken_on` | `date` nullable | |

**Invariante**: `length(btrim(alt_text)) > 0`. Un `alt` vacío se rechaza en la base, no sólo en el
formulario, porque el formulario puede cambiar.

**Sobre `media` y el contenido versionado**: `media` guarda las fotografías porque una foto se sube
desde un teléfono y no puede requerir un despliegue. La prosa, en cambio, vive en `content/`. La
frontera exacta está más abajo, en la sección 8.

### `payment_methods` — cómo colaborar

| Columna | Tipo | Notas |
|---|---|---|
| `campaign_id` | `uuid` | |
| `kind` | enum `payment_method_kind` | `bank_transfer` hoy; `mercado_pago`, `stripe`, `paypal` reservados (FR-008) |
| `country_code` | `char(2)` | `AR` \| `CL` \| `US` |
| `currency` | `char(3)` | |
| `label` | `text` | "Transferencia en Argentina" |
| `fields` | `jsonb` | Lista ordenada de `{ label, value, copyable, hint }`. Cada país necesita campos distintos, y `jsonb` evita 15 columnas nullables |
| `instructions` | `text` nullable | |
| `sort_order` | `int` | |
| `published_at` | `timestamptz` **nullable** | **Nulo = no se muestra.** Es la defensa de FR-007 |

**Invariante**: `fields` valida contra un esquema Zod antes de publicarse; ningún valor puede ser
la cadena `PENDIENTE`.

### `people`

| Columna | Tipo | Notas |
|---|---|---|
| `slug`, `full_name`, `role_label`, `bio` | | |
| `born_on`, `died_on` | `date` **nullable** | Nulos mientras la familia no publique las fechas. Si son nulos, el JSON-LD **omite** `birthDate`/`deathDate` en lugar de estimarlos |
| `portrait_media_id` | `uuid` nullable → `media` | |
| `published_at` | | |

### `user_roles`

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | `uuid` → `auth.users` | |
| `role` | enum `app_role` | `owner` \| `admin` \| `editor` \| `auditor` |
| `granted_by`, `granted_at` | | |

Único por `(user_id, role)`. Una persona puede tener varios roles; el hook resuelve al más
privilegiado.

### `audit_log`

| Columna | Tipo | Notas |
|---|---|---|
| `actor_id` | `uuid` nullable | Nulo sólo para acciones del sistema |
| `action` | `text` | `expense.created`, `contribution.voided`… |
| `entity_table`, `entity_id` | | |
| `diff` | `jsonb` nullable | Antes/después, **sin datos sensibles** |
| `occurred_at` | `timestamptz` | |

Sin policies de `UPDATE` ni `DELETE` para nadie, ni para `owner`.

**Escriben acá las quince operaciones del backoffice, sin excepción.** No sólo las financieras que pide
FR-016: también guardar una novedad, agregarle una foto y guardar un hito, porque las tres cambian lo
que el sitio publica. Es una obligación del tipo y no una convención
([ADR-020](../../docs/adr/020-rastro-obligatorio.md)).

Y el `INSERT` **no llega por privilegio de tabla**: `authenticated` sólo tiene `SELECT`, y el rastro se
agrega llamando a `public.record_audit(action, entity_table, entity_id, diff)`, que es `security
definer` y comprueba `has_min_role('auditor')` en su primera línea
([ADR-019](../../docs/adr/019-auditoria-por-funcion.md)). El motivo es que no hay una policy de
`INSERT` que pueda ser correcta: el rango de quien hace una operación auditada va de `auditor` —abrir
un comprobante se registra— hasta `owner`, y una policy escrita para el rango entero le abriría la
escritura al rol que tiene que ser de sólo lectura en `public`.

---

## 3. Vista pública agregada

Los totales se calculan en la base (FR-012), no en el cliente:

```sql
create view public.campaign_totals with (security_invoker = true) as
select
  c.id as campaign_id,
  c.goal_amount_minor,
  c.goal_currency,
  c.reconciled_at,
  coalesce(sum(...) filter (where contributions.voided_at is null), 0) as received_minor,
  coalesce(sum(...) filter (where expenses.voided_at   is null), 0) as spent_minor,
  ... as balance_minor,
  ... as executed_percent
from public.campaigns c ...;
```

`security_invoker = true` no es opcional: **las vistas bypasean RLS por defecto** en Postgres, y una
vista sin esa opción sobre `contributions` expondría aportes individuales. Es la trampa que
documenta la skill oficial de Supabase.

La vista agrega **por moneda**. No convierte. Si hay aportes en pesos y en dólares, se muestran por
separado; una conversión requiere tipo de cambio explícito y fechado, que hoy no existe.

---

## 4. Matriz de visibilidad (RLS)

`anon` = visitante sin sesión. Todas las tablas tienen RLS habilitada.

| Tabla | `anon` | `auditor` | `editor` | `admin` | `owner` |
|---|---|---|---|---|---|
| `campaigns` | leer publicadas | leer todo | leer todo | leer/escribir | leer/escribir |
| `budget_items` | leer publicadas | leer todo | leer todo | CRUD | CRUD |
| `milestones` | leer publicados | leer todo | crear/editar | CRUD | CRUD |
| `updates`, `update_media` | leer publicadas | leer todo | **CRUD** | CRUD | CRUD |
| `media` | leer | leer | **crear/editar** | CRUD | CRUD |
| `expenses` | leer publicados | leer todo | — | CRUD | CRUD |
| `expense_receipts` | **nada** | **leer** | — | CRUD | CRUD |
| `contributions` | **nada** | **leer** | — | CRUD | CRUD |
| `payment_methods` | leer publicados | leer todo | — | — | **CRUD** |
| `people` | leer publicadas | leer todo | editar | CRUD | CRUD |
| `user_roles` | nada | nada | nada | leer | **CRUD** |
| `audit_log` | nada | **leer** + agregar por `record_audit()` | agregar por `record_audit()` | leer + agregar | leer + agregar |
| `campaign_totals` (vista) | leer | leer | leer | leer | leer |

Decisiones que hay que notar:

- **`auditor` es sólo lectura, incluidos comprobantes.** Es el rol que permite que alguien externo
  a la familia verifique sin poder alterar nada. La única fila que su sesión puede llegar a agregar es
  la del propio rastro de auditoría, y no por una policy sino por `record_audit()`: abrir un comprobante
  queda registrado, y ese registro tiene que poder escribirse sin darle escritura sobre nada más.
- **`editor` no ve aportes ni gastos.** Publica contenido; no toca plata. Privilegio mínimo real.
- **Sólo `owner` administra cuentas bancarias.** Cambiar un CBU es la operación de mayor impacto del
  sistema: quien la controle puede desviar todos los aportes.
- **`anon` lee gastos pero no aportes.** Asimetría deliberada: un gasto es información institucional;
  un aporte individual puede identificar a una persona.

### Forma de las policies

```sql
-- Lectura: publicado para todos, todo para roles internos. UNA sola policy por
-- rol/comando para no disparar multiple_permissive_policies.
create policy expenses_select on public.expenses
  for select to anon, authenticated
  using (
    (published_at is not null and voided_at is null)
    or private.has_min_role('auditor')
  );

-- Escrituras siempre por comando, nunca `for all`.
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (private.has_min_role('admin'));
```

`private.has_min_role()` es `security definer`, vive en un esquema no expuesto, lleva
`set search_path = ''`, chequea `auth.uid()` internamente, y tiene `revoke execute ... from public,
anon, authenticated`. Lee el claim así:

```sql
((select auth.jwt()) -> 'app_metadata' ->> 'user_role')
```

El subselect envuelve **la llamada**, no la expresión: es lo único que `db advisors` acepta.

### Índices exigidos por las policies

Toda columna que filtre una policy necesita índice propio liderando un btree:
`expenses(published_at)`, `expenses(campaign_id, spent_at)`, `contributions(campaign_id)`,
`expense_receipts(expense_id)`, `user_roles(user_id)`, `updates(published_at)`,
`updates(slug)`, `media(storage_path)`. Verificado con aserciones `has_index` de pgTAP.

---

## 5. Storage

| Bucket | Público | Contenido | Policies |
|---|---|---|---|
| `fotos` | **sí** | Fotografías del avance y retratos | Lectura para todos; escritura sólo `editor`+ |
| `comprobantes` | **no** | Facturas y recibos | Ninguna lectura pública. `auditor`+ obtiene URL firmada de corta duración |

Para el bucket público hay que usar los helpers de operación (`storage.allow_only_operation()`), o
una policy de `select` permite **listar el contenido del bucket**, no sólo obtener objetos. Para
upsert hacen falta `INSERT` + `SELECT` + `UPDATE` juntas, o el reemplazo de archivo falla en
silencio.

---

## 6. Invariantes de dominio (verificados con tests unitarios)

| Invariante | Consecuencia si se viola |
|---|---|
| `Money` no suma monedas distintas | Error de tipos en compilación |
| `Money` no acepta no-enteros ni `NaN` | Excepción en construcción |
| `Percentage` está en `[0, 100]` | Se acota, y se registra si venía fuera de rango |
| Saldo = recibido − gastado, **por moneda** | Un saldo mezclado es un dato falso |
| % ejecutado = gastado / objetivo, `null` si no hay objetivo | Nunca se muestra `0%` cuando el objetivo no está cargado |
| Un registro anulado no participa de ningún total | Los totales dejarían de cerrar con el detalle |
| La suma del detalle mostrado es igual al total mostrado | SC-007 |

---

## 7. Degradación sin base de datos (FR-034)

Los repositorios se resuelven en tiempo de ejecución según haya credenciales:

| Estado | Contenido editorial | Cifras y datos operativos |
|---|---|---|
| Con Supabase configurado | `content/` | Supabase |
| Sin Supabase configurado | `content/` | **Omitidas**, con aviso |

Nunca se muestran ceros ni datos de ejemplo en lugar de las cifras reales. La ausencia se comunica.

---

## 8. Frontera exacta entre `content/` y la base

`people` tiene columnas de prosa (`bio`) y fechas (`born_on`, `died_on`) que **la página pública no
lee en la versión 1**. Es una decisión, no un descuido, y conviene que quede escrita porque de otro
modo el mismo dato existiría en dos lugares y en algún momento iban a discrepar.

| Dato | Fuente autoritativa en v1 | Motivo |
|---|---|---|
| Prosa de la historia de Norma, de qué ocurrió, de la reconstrucción, del legado, preguntas y legales | `content/*.json` | Cambia pocas veces, se revisa con calma, y merece pasar por revisión de código como cualquier otro texto publicado |
| Fechas de nacimiento y muerte | `content/norma.json` (hoy `null`) | Son parte del mismo relato; separarlas de la prosa las volvería un dato huérfano |
| Fotografías, retratos, `alt`, epígrafes | `media` + `people.portrait_media_id` | Se suben desde un teléfono; exigir un despliegue para publicar una foto haría que no se publique |
| Montos, aportes, gastos, hitos, cuentas, novedades | Base | Cambian seguido y los edita quien no toca código |

Las columnas de prosa de `people` se conservan en el esquema para el momento en que la familia
quiera editar la historia desde el backoffice sin pasar por un despliegue. Hasta que exista ese
formulario, **nadie las lee**, y ese es el único estado en el que dos fuentes para el mismo dato no
generan una contradicción.
