# Investigación: Supabase sin Docker, RLS y CI/CD

**Fecha de verificación:** 2026-09-09 · **Entorno:** Ubuntu 24.04, sin Docker, con sudo

Verificado ejecutando el pipeline completo en `/tmp`: 3 migraciones aplicadas, `db lint` limpio,
`db advisors` limpio, **24 aserciones pgTAP pasando** y tipos TypeScript generados — todo con
`docker: NOT PRESENT`.

---

## 1. Hallazgo principal: no hace falta Docker ni credenciales

La palanca es `--db-url` más un Postgres instalado por apt.

| Comando | ¿Sin Docker? | Evidencia |
|---|---|---|
| `supabase init` | **Sí** | `Finished supabase init.` |
| `supabase migration new <n>` | **Sí** | genera el nombre con timestamp correcto |
| `supabase migration up --db-url` | **Sí** | `{"applied":[...],"message":"Migrations applied"}` |
| `supabase migration list --db-url` | **Sí** | |
| `supabase db push --db-url` | **Sí** | |
| `supabase db query --db-url` | **Sí** | requiere CLI ≥ 2.79.0 |
| `supabase db lint --db-url` | **Sí\*** | \*necesita `postgresql-16-plpgsql-check` de apt |
| `supabase db advisors --db-url` | **Sí** | requiere CLI ≥ 2.81.3 |
| `supabase gen types --db-url` | **No** | `LegacyDockerRunError: docker: command not found` |
| `supabase db diff` / `db pull` | **No** | construyen una *shadow database* en contenedor |
| `supabase test db` | **No** | corre pgTAP en contenedor |
| `supabase start` / `db reset` | **No** | Docker por definición |

**Consecuencia de arquitectura:** como `db diff` necesita Docker, **el workflow declarativo
(`supabase/schemas/`) queda descartado**. Se usan **migraciones imperativas** escritas a mano con
`supabase migration new`. Eso además evita las limitaciones documentadas de `db diff`, que no
rastrea `alter policy` de RLS, comentarios, particiones, vistas materializadas ni
`security_invoker`.

Los dos comandos que sí necesitan Docker tienen sustitutos limpios (secciones 4 y 5).

## 2. CLI de Supabase

Versión actual: **2.117.0**. El paquete npm ya **no** descarga binarios en `postinstall`: es un
shim JS de 24 KB que resuelve una dependencia opcional por plataforma (`@supabase/cli-linux-x64`),
igual que esbuild. Instalación reproducible por lockfile:

```bash
npm i -D supabase@2.117.0
npx supabase --version   # 2.117.0
```

`npx supabase` **no** está deprecado.

## 3. Postgres local

`postgresql-16` de apt resuelve a **16.15**. Sin systemd se maneja directo:

```bash
sudo apt-get install -y postgresql-16 postgresql-contrib-16 \
                        postgresql-16-pgtap postgresql-16-plpgsql-check
sudo pg_ctlcluster 16 main start
```

Las dos extensiones que hacen falta están en apt: `pgtap` **1.3.2-2** y `plpgsql_check` **2.7.2-1**.

`embedded-postgres@18.4.0-beta.17` funciona, pero **no trae pgTAP ni plpgsql_check** (se
enumeraron sus 60 extensiones), es beta y empaqueta Postgres 18, que diverge de la versión de
Supabase. Peor opción para el mismo trabajo.

**No mockear la capa de repositorios**: el objetivo es testear las policies RLS, y un mock no
puede decir si una policy es correcta.

### El shim de plataforma

Entre Postgres pelado y Supabase hay que recrear lo que aporta la plataforma: los esquemas `auth`,
`storage`, `extensions`; los roles `anon`, `authenticated`, `service_role`, `authenticator`,
`supabase_auth_admin`; `auth.users`; las funciones `auth.uid()`, `auth.jwt()`, `auth.role()`,
`auth.email()` leyendo de `request.jwt.claims`; `storage.buckets` y `storage.objects`;
`storage.foldername()`; y **los privilegios por defecto de Supabase**. Vive fuera de
`supabase/migrations/` para que nunca se empuje a un proyecto real.

**Grants y RLS son dos capas distintas, y esto muerde localmente.** Supabase real corre
`grant all on all tables in schema public to anon, authenticated, service_role`, así que **RLS es
la única compuerta**. Una base local sin esos grants hace que un error de grant se disfrace de
fallo de RLS y —peor— que policies inalcanzables en producción parezcan pasar. Regla para
depurar: **un grant faltante devuelve error de permiso; una policy que no matchea devuelve
resultado vacío.**

## 4. Tipos TypeScript sin base viva

El generador se extrajo a un paquete agnóstico del driver: **`@supabase/postgrest-typegen@0.2.1`**
(el que usa internamente `@supabase/postgres-meta`). `introspect(db)` acepta cualquier
`Queryable`, y `pg.Pool` lo satisface. No es una aproximación: es el mismo code path.

```js
import { introspect, sortGeneratorMetadata, generateTypescript }
  from "@supabase/postgrest-typegen";
const metadata = await introspect(pool, { includedSchemas: ["public"] });
const code = await generateTypescript(sortGeneratorMetadata(metadata), {
  detectOneToOneRelationships: true, postgrestVersion: "13",
});
```

Alcance real de los tipos generados, medido a propósito: un **nombre de tabla** inválido es error
de compilación duro; una **columna** inválida dentro del string de `.select()` **no** falla en la
llamada — el tipo del resultado se convierte en un `SelectQueryError<"column ... does not exist">`
que sólo falla cuando se consume el campo. O sea: un typo de columna en una query cuyo resultado
se pasa sin tocar **compila**. No alcanza con `tsc` como única compuerta de esquema.

## 5. pgTAP sin Docker

`supabase test db` necesita Docker, pero **pgTAP no**: se instala por apt y corre con `psql`. La
técnica que hace testeable RLS es exactamente cómo PostgREST presenta un request a Postgres:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"...","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select is((select count(*)::int from public.expenses), 12, 'admin ve todos los gastos');
```

**pgTAP reporta las fallas en su salida, no en el exit code.** El runner tiene que parsear
`not ok` y salir 1, o los tests fallan en silencio.

## 6. RLS: lo que la práctica corrige de la documentación

### La regla del subselect es más estricta de lo que parece

Hay que envolver **la llamada `auth.*()` en sí**, no la expresión que la contiene:

```sql
-- MAL: expresión entera envuelta. db advisors lo marca auth_rls_initplan
using ((select auth.jwt() -> 'app_metadata' ->> 'user_role') = 'admin')

-- BIEN: la llamada envuelta
using (((select auth.jwt()) -> 'app_metadata' ->> 'user_role') = 'admin')
```

La primera forma guarda un qual que parece razonable y **igual se marca**. Escrita de la manera
intuitiva, toda policy basada en claims queda marcada.

### `db advisors` es el linter real

`supabase db lint` sólo corre `plpgsql_check` (tipado de cuerpos PL/pgSQL); no dice nada de RLS.
`db advisors` corre las mismas reglas que los advisors del dashboard, acepta `--db-url` y no
necesita Docker ni credenciales. En la investigación encontró 7 problemas reales en migraciones
escritas con cuidado:

| Hallazgo | Corrección |
|---|---|
| `auth_rls_initplan` ×2 | envolver la llamada, no la expresión |
| `multiple_permissive_policies` ×2 | declarar escrituras **por comando** (`for insert` / `for update` / `for delete`), nunca `for all` — un `for all` cubre `SELECT` y colisiona con la policy de lectura. Y fusionar "propia o admin" en **una** policy con `or`, no dos |
| `extension_in_public` ×2 | `create extension ... with schema extensions` |
| `function_search_path_mutable` | `set search_path = ''` en toda función, incluido el auth hook (el ejemplo de la documentación oficial lo omite) |

### `SECURITY DEFINER`

Postgres otorga `EXECUTE` a `PUBLIC` por defecto: una función `SECURITY DEFINER` en `public` es un
endpoint público invocable por `anon`. Reglas: esquema privado no expuesto, `set search_path = ''`,
nombres calificados con esquema, chequeo de `auth.uid()` **dentro** del cuerpo, y
`revoke execute ... from public, anon, authenticated`.

### Índices

Toda columna que filtre una policy necesita índice **propio y liderando** un btree. Una PK
compuesta `(a, b)` no sirve para una policy que filtra por `b`.

### RBAC: tabla *y* auth hook, no uno u otro

La tabla `user_roles` es la fuente de verdad; el `custom_access_token_hook` la desnormaliza al JWT
para que las policies lean un claim en lugar de hacer un join por fila. El claim va en
**`app_metadata`**, nunca en `user_metadata` (editable por el usuario). Crear la función no
alcanza: hay que habilitar el hook en `config.toml` (`[auth.hook.custom_access_token]`) o en el
dashboard. Los claims son tan frescos como el último refresh del token.

## 7. Auth con Next.js 16

### Nombres de claves: publishable, no anon

| Tipo | Formato | Estado |
|---|---|---|
| Publishable | `sb_publishable_…` | **Actual** |
| Secret | `sb_secret_…` | **Actual** |
| `anon` / `service_role` | JWT (`eyJ…`) | Legacy, deprecación a fin de 2026 |

Las claves publishable/secret **no son JWT**: van en el header `apikey`, no en
`Authorization: Bearer`. Heurística útil: si un tutorial dice copiar una clave larga que empieza
con `eyJ`, está escrito para las claves legacy.

### `getClaims()` en lugar de `getUser()`

`getClaims()` verifica la firma del JWT localmente con WebCrypto contra un JWKS cacheado: es
barato *y* confiable. `getUser()` cuesta un round-trip. `getSession()` **no** debe usarse para
autorizar: lee storage local sin revalidar.

### `setAll` recibe un segundo argumento (nuevo en 0.12.x)

```ts
type SetAllCookies = (
  cookies: { name: string; value: string; options: CookieOptions }[],
  headers: Record<string, string>,
) => Promise<void> | void;
```

Esos headers son `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`,
`Expires: 0`, `Pragma: no-cache`. **Si se descartan, un CDN puede cachear un `Set-Cookie` y
servir la sesión de un usuario a otro.** Se entregan sólo en la primera escritura de cookie por
cliente, y de ahí que sea obligatorio **crear un cliente nuevo por request**.

### `proxy.ts` no es frontera de seguridad

CVE-2025-29927. Sólo hace redirects optimistas; toda ruta de datos revalida.

## 8. CI/CD

La documentación oficial de `managing-environments` está desactualizada en dos puntos: fija
`supabase/setup-cli@v1` (el actual es **v3.0.0**) y su job corre `db start` + `gen types --local`,
que necesitan Docker.

`supabase/setup-cli@v3` instala por npm y **detecta la versión del lockfile** si se omite
`version`, que es la forma correcta de mantener CI y local sincronizados.

Variables para modo no interactivo: `SUPABASE_ACCESS_TOKEN` (PAT), `SUPABASE_DB_PASSWORD`,
`SUPABASE_PROJECT_ID`. `--db-url` es la alternativa a `link`, y **debe ir percent-encoded**.

El grupo `concurrency` no es opcional: las migraciones se aplican en orden de timestamp y pushes
concurrentes desde máquinas distintas conflictúan.

Sobre **Branching**: no existe ningún producto llamado "Branching 2.0". Cada branch es una
instancia Supabase separada con credenciales propias, **sin datos** por defecto, y requiere plan
pago. Para dos entornos, el par staging/producción es más simple y funciona en cualquier plan.

## 9. Lo que no se puede verificar sin credenciales

- **Runtime de auth**: nunca se emitió un JWT real. Verificación de firma en `getClaims()` contra
  un JWKS vivo, refresh de token a través de `proxy.ts`, y el nombre/chunking de la cookie
  `sb-<ref>-auth-token`.
- **El auth hook en situ**: se probó que la función devuelve el JSON correcto para un `event`
  sintético, no que GoTrue la llame con ese payload exacto.
- **Claves publishable/secret de punta a punta**: el requisito del header `apikey`, el bloqueo 401
  por `User-Agent` de navegador.
- **Todo lo que requiere proyecto**: `link`, `db push` contra un remoto real, variantes
  `--linked`, `projects api-keys`.
- **Storage como servicio**: uploads reales, si Storage estampa `owner_id` como se asume, la ruta
  de CDN del bucket público.
- **Fidelidad del shim** — el caveat más importante. `auth.users` real tiene muchas más columnas;
  no hay GoTrue, PostgREST, `pg_graphql` ni Realtime. Una migración que referencie objetos de
  plataforma no stubbeados falla local y funciona en el proyecto hosteado, **y también puede pasar
  lo inverso**. Mitigación: `db push --dry-run` antes del primer push real, y tratar el primer
  `db advisors --linked` como la compuerta verdadera.
