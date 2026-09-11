# ADR-002 · Supabase como base de datos, autenticación y almacenamiento

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

El sistema necesita: PostgreSQL con reglas de acceso a nivel de fila (los aportes y los
comprobantes no pueden ser públicos), autenticación para cuatro roles, almacenamiento de archivos
con un bucket público y uno privado, y migraciones versionadas. Todo eso mantenido por una persona
sin equipo de infraestructura.

## Decisión

Supabase: PostgreSQL 16, Auth, Storage. RLS habilitada en **todas** las tablas de esquemas
expuestos, con policies explícitas. Migraciones imperativas versionadas en `supabase/migrations/`.
Dos buckets: `fotos` público, `comprobantes` privado.

Realtime **no** se usa: no hay ningún caso donde alguien necesite ver un cambio en vivo.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Postgres administrado (Neon, RDS) + auth propia | Habría que construir autenticación y almacenamiento. Más código propio en la parte donde un error es más caro |
| Firebase | El modelo de reglas de Firestore es menos expresivo que RLS para "público lee lo publicado, auditor lee todo, editor no ve plata", y perderíamos SQL para los totales |
| Prisma o Drizzle sobre Postgres | Un ORM agrega una capa de traducción sin resolver la autorización, que acá es el problema central. Las policies viven en la base, no en el ORM |
| Esquemas declarativos de Supabase (`supabase/schemas/`) | Depende de `supabase db diff`, que requiere Docker (no disponible), y además no rastrea `alter policy` ni `security_invoker` |

## Consecuencias

**Buenas.** La autorización vive en la base, así que es la misma para la UI, la API, WebMCP y
cualquier cliente futuro; no se puede saltear desde el código. Los totales se calculan en SQL, lo
que hace que la suma del detalle coincida con el total por construcción (SC-007). pgTAP permite
testear las policies de verdad.

**Malas y aceptadas.**

- Dependencia de un proveedor. Se mitiga con que el esquema es PostgreSQL estándar y las
  migraciones son SQL: migrar significaría reimplementar Auth y Storage, no los datos.
- Sin Docker no se puede correr el stack completo local. Ver ADR-013.
- Hay trampas específicas de Supabase que hay que respetar y que no son obvias: las vistas bypasean
  RLS salvo `security_invoker = true`; `user_metadata` es editable por el usuario y no sirve para
  autorizar; un `UPDATE` sin policy de `SELECT` devuelve 0 filas sin error; el upsert de Storage
  necesita `INSERT` + `SELECT` + `UPDATE` juntas. Están codificadas en los tests pgTAP para que no
  se olviden.
- Las claves cambiaron de formato: `sb_publishable_…` y `sb_secret_…` reemplazan a las claves JWT
  `anon`/`service_role`, que se deprecan a fin de 2026. `.env.example` usa los nombres nuevos.
