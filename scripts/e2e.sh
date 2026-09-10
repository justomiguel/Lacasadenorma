#!/usr/bin/env bash
#
# Los nueve flujos críticos, en los dos modos que documenta playwright.config.ts.
#
# Este script existe por una razón concreta: Next reemplaza las variables
# `NEXT_PUBLIC_*` por su valor **durante la construcción**. "El sitio con base de
# datos" y "el sitio sin base de datos" no son dos configuraciones del mismo
# servidor, son dos builds. Playwright puede levantar servidores, no construirlos
# con entornos distintos, así que la preparación vive acá.
#
# Uso: scripts/e2e.sh <sin-datos|con-datos> [argumentos de playwright…]
#
#   sin-datos   el sitio construido sin credenciales. Verifica FR-034 y SC-012.
#               No necesita PostgreSQL: es lo que corre en cualquier clon nuevo.
#   con-datos   recrea la base local, carga el fixture y construye el sitio contra
#               la API local. Es el único modo donde los flujos 3, 4, 5 y 7 tienen
#               datos que verificar.
#
# Variables que reconoce:
#
#   E2E_REUSAR=1   reusa el build y la base que ya están, en lugar de rehacerlos.
#                  Sirve para iterar sobre los tests; en CI nunca se usa, y si el
#                  build que hay no es del modo pedido, corta con un error.
#
# Ejemplos:
#
#   scripts/e2e.sh sin-datos
#   scripts/e2e.sh con-datos --project=escritorio e2e/con-datos/portapapeles.spec.ts

set -Eeuo pipefail

cd "$(dirname "$0")/.."

modo="${1:-}"
shift || true

case "$modo" in
  sin-datos | con-datos) ;;
  *)
    echo "Uso: scripts/e2e.sh <sin-datos|con-datos> [argumentos de playwright…]" >&2
    exit 1
    ;;
esac

say() {
  printf '\n\033[1m%s\033[0m\n' "$*"
}

export E2E_MODO="$modo"

if [[ "$modo" == "con-datos" ]]; then
  export PORT="${PORT:-3211}"
  export LOCAL_API_PORT="${LOCAL_API_PORT:-54321}"
  export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:${LOCAL_API_PORT}"
  # La clave la firma el propio script de la API local con un secreto de
  # desarrollo escrito en su código: se le pregunta a él en lugar de copiarla acá,
  # porque dos copias de una credencial se desincronizan y la segunda queda
  # pareciendo un secreto de verdad.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$(node scripts/local-api.mjs --print-anon-key)"
  export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
else
  export PORT="${PORT:-3210}"
  # Vacías y exportadas, no ausentes: en una máquina de desarrollo `.env.local`
  # tiene la base configurada, y Next la leería. Una variable vacía gana sobre el
  # archivo y `readSupabaseConfig()` la trata como ausente.
  export NEXT_PUBLIC_SUPABASE_URL=""
  export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
fi

# La canónica, el sitemap, el JSON-LD y la imagen de compartir se derivan de esto.
# Sin fijarlo, las afirmaciones del flujo 6 medirían la URL de otra máquina.
export NEXT_PUBLIC_SITE_URL="http://127.0.0.1:${PORT}"

# El build lleva su entorno adentro: `NEXT_PUBLIC_*` se reemplaza por su valor al
# construir. Se deja anotado cuál se usó para que reusarlo no sea a ciegas: un build
# del otro modo pasa la mayoría de los tests y falla los tres que miran las URL
# canónicas, que es la peor forma de fallar porque no se sospecha del build.
HUELLA=".next/e2e-modo"

# Incluye el identificador del build para que la anotación no pueda quedar hablando de
# un build que ya no está: cualquier `npm run build` de otro modo —o de `npm run
# verify`— lo cambia, y la comprobación falla en lugar de dar por bueno lo que hay.
huella() {
  printf '%s %s %s' "$modo" "$NEXT_PUBLIC_SITE_URL" "$(cat .next/BUILD_ID 2>/dev/null)"
}

if [[ "${E2E_REUSAR:-}" == "1" ]]; then
  if [[ "$(cat "$HUELLA" 2>/dev/null)" != "$(huella)" ]]; then
    echo "El build que hay en .next no es el de modo ${modo}." >&2
    echo "Corré de nuevo sin E2E_REUSAR=1." >&2
    exit 1
  fi

  say "Reusando el build y la base que ya están (E2E_REUSAR=1)"
else
  if [[ "$modo" == "con-datos" ]]; then
    say "Recreando la base local y cargando el fixture"
    ./scripts/db-local.sh reset
    ./scripts/db-local.sh fixture
  fi

  say "Construyendo el sitio en modo ${modo}"
  npm run build
  huella > "$HUELLA"
fi

say "Recorriendo los flujos críticos en modo ${modo}"
npx playwright test "$@"
