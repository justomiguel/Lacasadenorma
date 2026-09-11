# Fase 1 — Quickstart

Cómo levantar y verificar el proyecto. **Sin credenciales de Supabase**: el sitio funciona con el
contenido versionado en el repositorio y omite las cifras (FR-034, SC-012).

---

## 1. Requisitos

- Node.js ≥ 22 (mínimo real de Next 16: 20.9)
- npm ≥ 10
- Opcional, sólo para trabajar con la base de datos: PostgreSQL 16 con `pgtap` y `plpgsql_check`

## 2. Arrancar

```bash
npm install
npm run dev          # http://localhost:3000
```

No hace falta `.env`. Sin variables de Supabase, el sitio muestra el contenido editorial y omite
montos, gastos e hitos, con un aviso visible en lugar de ceros.

## 3. Verificar

```bash
npm run verify       # typecheck + lint + format + tests + build
npm run test:e2e     # Playwright + axe (instala navegadores la primera vez)
```

## 4. Base de datos local, sin Docker

```bash
sudo apt-get install -y postgresql-16 postgresql-contrib-16 \
                        postgresql-16-pgtap postgresql-16-plpgsql-check
sudo pg_ctlcluster 16 main start

npm run db:verify    # recrea, aplica shim + migraciones, lint, advisors, pgTAP, tipos
```

`db:verify` hace, en orden: recrear la base local → aplicar el shim de plataforma (roles, esquemas
`auth`/`storage`, `auth.uid()`, `auth.jwt()`, privilegios por defecto de Supabase) → aplicar las
migraciones con `supabase migration up --db-url` → `supabase db lint` → `supabase db advisors` →
todas las suites pgTAP → regenerar `src/infrastructure/supabase/database.types.ts`.

Docker no hace falta y no se usa. Los comandos del CLI que sí lo requieren (`gen types`, `db diff`,
`db pull`, `test db`) están reemplazados: los tipos se generan con `@supabase/postgrest-typegen`
sobre `pg`, y pgTAP corre por `psql`.

## 5. Con un proyecto Supabase real

```bash
cp .env.example .env.local     # completar con los datos del proyecto
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push --dry-run # SIEMPRE antes del push real
npx supabase db push
npx supabase db advisors --linked --level warn
```

Después hay que habilitar el auth hook (`custom_access_token_hook`) en el panel, en
Authentication → Hooks, o el rol no llega al token y nadie puede administrar nada.

## 6. Verificación manual mínima antes de dar algo por terminado

1. Abrir la home en 360 px de ancho: se entiende qué es y qué se puede hacer sin desplazarse.
2. Recorrer con Tab: el foco es visible siempre y se puede copiar un dato bancario.
3. Con el modo "reducir movimiento" activo: no hay animaciones.
4. `npm run build` y revisar que no haya advertencias nuevas.
5. Ninguna cifra o dato de ejemplo visible en pantalla.
