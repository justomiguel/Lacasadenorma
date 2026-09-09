#!/usr/bin/env bash
#
# Base de datos local sin Docker (ADR-013).
#
# El entorno de desarrollo de este repositorio no tiene Docker, así que no se usa
# `supabase start`. En su lugar: un PostgreSQL de `apt`, el shim de
# `supabase/shim/` que recrea la parte de la plataforma que las migraciones
# asumen, y los comandos del CLI de Supabase que aceptan `--db-url`.
#
# Lo que esto sí permite: aplicar las migraciones sin modificarlas, probar las
# policies RLS de verdad con pgTAP, y generar los tipos de TypeScript.
#
# Lo que no reemplaza: GoTrue, PostgREST ni Realtime. La compuerta antes del
# primer push a producción es `supabase db push --dry-run` contra el proyecto
# real. Está documentado como riesgo aceptado en el modelo de amenazas.
#
# Uso: scripts/db-local.sh <comando>
#
#   bootstrap  crea el rol y las bases locales (pide sudo una vez)
#   reset      recrea la base de desarrollo desde cero y aplica las migraciones
#   migrate    aplica las migraciones pendientes sobre la base de desarrollo
#   fixture    carga el fixture de desarrollo sobre la base de desarrollo
#   lint       errores de esquema que el CLI de Supabase sabe detectar
#   advisors   advisors de seguridad y performance sobre el esquema local
#   test       corre las pruebas pgTAP sobre una base recreada
#   types      regenera los tipos de TypeScript de la base
#   verify     reset + lint + test + types --check (lo que corre en CI)

set -Eeuo pipefail

cd "$(dirname "$0")/.."

# ─────────────────────────────────────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────────────────────────────────────

# Credencial de una base local y descartable, del mismo carácter que el
# `postgres:postgres@127.0.0.1:54322` que Supabase documenta para su entorno
# local. No es un secreto: no existe fuera de esta máquina y el esquema se borra
# entero en cada reset.
DB_HOST="${PGHOST:-127.0.0.1}"
DB_PORT="${PGPORT:-5432}"
DB_USER="norma_local"
DB_PASSWORD="norma_local"
DEV_DB="norma_dev"
TEST_DB="norma_test"

DEV_URL="${LOCAL_DATABASE_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DEV_DB}}"
TEST_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB}"

SHIM="supabase/shim/00-platform.sql"
FIXTURE="supabase/fixtures/dev.sql"
TYPES_FILE="src/infrastructure/supabase/database.types.ts"

# psql con la configuración que corresponde a una migración: cualquier error
# aborta la transacción entera en lugar de dejar el esquema a mitad de camino.
psql_strict() {
  local url="$1"
  shift
  PGPASSWORD="$DB_PASSWORD" psql "$url" --quiet --no-psqlrc --set ON_ERROR_STOP=1 "$@"
}

say() {
  printf '\n\033[1m%s\033[0m\n' "$*"
}

# ─────────────────────────────────────────────────────────────────────────────
# Comandos
# ─────────────────────────────────────────────────────────────────────────────

# Lo único que necesita privilegios del sistema. Se corre una vez por máquina.
cmd_bootstrap() {
  say "Creando el rol y las bases locales"

  local as_postgres=(sudo -u postgres psql --quiet --no-psqlrc --set ON_ERROR_STOP=1)

  # El rol es superusuario porque las migraciones crean esquemas, roles y
  # funciones security definer, que es exactamente lo que hace la plataforma con
  # su propio rol `postgres`.
  "${as_postgres[@]}" -c "
    do \$\$
    begin
      if not exists (select 1 from pg_roles where rolname = '${DB_USER}') then
        create role ${DB_USER} login superuser password '${DB_PASSWORD}';
      end if;
    end
    \$\$;"

  local db
  for db in "$DEV_DB" "$TEST_DB"; do
    if ! "${as_postgres[@]}" -tAc "select 1 from pg_database where datname = '${db}'" | grep -q 1; then
      "${as_postgres[@]}" -c "create database ${db} owner ${DB_USER}"
    fi
  done

  # pgTAP sólo hace falta en la base de pruebas.
  psql_strict "$TEST_URL" -c "create extension if not exists pgtap"

  say "Listo. LOCAL_DATABASE_URL por defecto: ${DEV_URL}"
}

# Borra todo lo que crearon las migraciones y vuelve a dejar el shim. No borra la
# base —eso necesitaría privilegios del sistema— pero a los efectos de una
# migración reproducible es lo mismo.
reset_schema() {
  local url="$1"

  psql_strict "$url" <<'SQL'
drop schema if exists public cascade;
drop schema if exists private cascade;
drop schema if exists storage cascade;
drop schema if exists auth cascade;
drop schema if exists supabase_migrations cascade;
create schema public;
SQL

  psql_strict "$url" --file "$SHIM"
}

apply_migrations() {
  local url="$1"

  # `supabase migration up` registra cada archivo en
  # supabase_migrations.schema_migrations igual que en producción, así el estado
  # local y el remoto se pueden comparar con `supabase migration list`.
  npx --no-install supabase migration up --db-url "$url" --include-all
}

cmd_reset() {
  say "Recreando ${DEV_DB}"
  reset_schema "$DEV_URL"
  apply_migrations "$DEV_URL"
}

cmd_migrate() {
  say "Aplicando migraciones pendientes en ${DEV_DB}"
  apply_migrations "$DEV_URL"
}

cmd_fixture() {
  if [[ ! -f "$FIXTURE" ]]; then
    echo "No existe ${FIXTURE}." >&2
    exit 1
  fi

  say "Cargando el fixture de desarrollo"
  psql_strict "$DEV_URL" --file "$FIXTURE"
}

cmd_lint() {
  say "Analizando el esquema"
  npx --no-install supabase db lint --db-url "$DEV_URL" --level warning --fail-on error
}

# El mismo conjunto de reglas que los advisors del panel de Supabase: RLS sin
# policies, funciones con `search_path` mutable, vistas sin `security_invoker`,
# policies que reevalúan `auth.*()` por fila. Es la compuerta que detecta un error
# de seguridad de esquema antes de que llegue a producción.
cmd_advisors() {
  say "Advisors de seguridad y performance"
  npx --no-install supabase db advisors \
    --db-url "$DEV_URL" --type all --level warn --fail-on warn
}

cmd_test() {
  say "Recreando ${TEST_DB} y corriendo pgTAP"
  reset_schema "$TEST_URL"
  psql_strict "$TEST_URL" -c "create extension if not exists pgtap"
  apply_migrations "$TEST_URL"

  # pg_prove corre cada archivo dentro de una transacción que revierte al final,
  # así que un test puede insertar datos sin ensuciar el siguiente.
  PGPASSWORD="$DB_PASSWORD" pg_prove \
    --host "$DB_HOST" --port "$DB_PORT" --username "$DB_USER" --dbname "$TEST_DB" \
    --ext .sql --recurse \
    supabase/tests
}

cmd_types() {
  say "Generando ${TYPES_FILE}"
  mkdir -p "$(dirname "$TYPES_FILE")"
  DATABASE_URL="$DEV_URL" node scripts/gen-types.mjs "$TYPES_FILE" "${1:-}"
}

cmd_verify() {
  cmd_reset
  cmd_lint
  cmd_advisors
  cmd_test
  cmd_types --check
}

case "${1:-}" in
  bootstrap) cmd_bootstrap ;;
  reset) cmd_reset ;;
  migrate) cmd_migrate ;;
  fixture) cmd_fixture ;;
  lint) cmd_lint ;;
  advisors) cmd_advisors ;;
  test) cmd_test ;;
  types) cmd_types "${2:-}" ;;
  verify) cmd_verify ;;
  *)
    sed -n '/^# Uso:/,/^#   verify/p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
