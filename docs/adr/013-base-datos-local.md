# ADR-013 · Desarrollo y testing de base de datos sin Docker

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

El flujo local recomendado por Supabase es `supabase start`, que levanta el stack completo en
contenedores. Docker **no está disponible** en el entorno donde se desarrolla este proyecto, y
tampoco hay credenciales de un proyecto Supabase.

Lo que no se puede negociar es que las policies RLS estén testeadas. Son la frontera que impide que
se filtre un comprobante o la identidad de quien aportó; descubrir un error ahí en producción es
exactamente el escenario a evitar.

## Decisión

PostgreSQL **17** instalado desde el repositorio oficial de PostgreSQL (la misma versión mayor que
trae un proyecto nuevo de Supabase), más un **shim de plataforma** que recrea la superficie que
aporta Supabase, más las partes del CLI que funcionan con `--db-url`.

Las extensiones que hacen falta son dos, y las dos vienen empaquetadas: `pgtap` para las pruebas de
policies y `plpgsql_check`, que es lo que `supabase db lint` habilita por debajo.

```
supabase/shim/       roles anon/authenticated/service_role, esquemas auth y storage,
                     auth.uid(), auth.jwt(), storage.foldername(),
                     y los privilegios por defecto de Supabase
supabase/migrations/ el artefacto real, que se empuja tal cual al proyecto
supabase/tests/      pgTAP
```

Qué se usa de cada cosa, según lo medido:

| Necesidad | Herramienta | Docker |
|---|---|---|
| Aplicar migraciones | `supabase migration up --db-url` | no |
| Linter de PL/pgSQL | `supabase db lint --db-url` (+ `plpgsql_check` de apt) | no |
| **Linter de seguridad y performance de RLS** | `supabase db advisors --db-url --fail-on warn` | no |
| Tests de policies | pgTAP por `psql` | no |
| Generar tipos TypeScript | `@supabase/postgrest-typegen` sobre `pg` | no |
| ~~`gen types`, `db diff`, `db pull`, `test db`~~ | — | **sí, y por eso no se usan** |

Consecuencia directa: como `db diff` requiere Docker, **el flujo declarativo de esquemas queda
descartado** y las migraciones se escriben a mano.

Todo se orquesta con `npm run db:verify`: recrear → shim → migraciones → lint → advisors → pgTAP →
tipos.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| `embedded-postgres` | No trae `pgtap` ni `plpgsql_check` (se enumeraron sus 60 extensiones), es beta y empaqueta Postgres 18, que diverge de la versión de Supabase |
| Mockear los repositorios | **No puede verificar si una policy RLS es correcta**, que es justamente lo que hay que verificar |
| Esperar a tener credenciales | Dejaría la autorización sin testear durante todo el desarrollo |
| Escribir las migraciones sin probarlas | Es la decisión que produce la filtración |
| Esquemas declarativos | Dependen de `db diff` (Docker). Además `db diff` no rastrea `alter policy`, comentarios ni `security_invoker`, que es justo lo que más importa acá |

## Consecuencias

**Buenas.** Las policies se testean de verdad, con la identidad simulada igual que lo hace PostgREST
(`set local role` + `set local request.jwt.claims`). `db advisors` es el mismo conjunto de reglas que
los advisors del panel, así que los problemas se detectan antes. El artefacto que se empuja al
proyecto real es el mismo SQL que se probó local.

**Malas y aceptadas.**

- **El shim es deliberadamente parcial**: no hay GoTrue, `pg_graphql` ni Realtime, y `auth.users` real
  tiene muchas más columnas —el shim tiene las cinco que el esquema y el fixture necesitan, incluida
  `encrypted_password` en el mismo formato bcrypt que usa la plataforma—. Una migración puede pasar
  local y fallar en el proyecto real, **y también lo inverso**, que es el modo de falla peligroso.
  Mitigación: `supabase db push --dry-run` antes del primer push, y tratar el primer
  `db advisors --linked` como la compuerta verdadera.
- **El rol que ejecuta algo importa tanto como el privilegio**, y el shim lo hizo evidente tarde. El
  `custom_access_token_hook` no lo invoca el dueño del esquema sino `supabase_auth_admin`, y hasta que
  `050-roles-y-token.sql` lo invocó con ese rol el hook fallaba con `permission denied for schema
  private`: ninguna sesión se habría podido emitir en producción. Regla que queda: **una prueba de una
  función `security invoker` que no fija el rol real no prueba nada sobre los privilegios.**
- La versión mayor coincide con la de un proyecto nuevo, pero la menor puede no coincidir. Es una
  diferencia mucho más chica que la del shim.
- **Los grants y RLS son capas distintas, y esto muerde local**: Supabase real otorga `grant all` a
  `anon` y `authenticated`, así que RLS es la única compuerta. Una base local sin esos grants hace
  que un error de permiso se disfrace de fallo de RLS. El shim reproduce los privilegios por defecto
  exactamente por eso. Regla para depurar: **un grant faltante devuelve error de permiso; una policy
  que no matchea devuelve resultado vacío.**
- **pgTAP reporta las fallas en su salida, no en el exit code.** El runner parsea `not ok` y sale 1;
  se verificó introduciendo una aserción que falla a propósito.
