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

# La API local que este script levanta, para bajarla al salir. Vacío si ya estaba
# levantada por otra persona: en ese caso no es nuestra y no se toca.
api_propia=""

al_salir() {
  if [[ -n "$api_propia" ]]; then
    kill "$api_propia" 2>/dev/null || true
  fi
}

trap al_salir EXIT

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

# ─────────────────────────────────────────────────────────────────────────────
# La API local tiene que estar arriba ANTES de construir
# ─────────────────────────────────────────────────────────────────────────────
#
# Esto parece un detalle de orden y es la diferencia entre probar el sitio y probar
# una cáscara vacía.
#
# Casi todas las páginas públicas son estáticas con `revalidate = 300`: Next las
# **prerenderiza durante el build**, leyendo la base. Si la API no está levantada en
# ese momento, cada página se hornea con la rama del dato ausente —correcta, pero sin
# una sola cifra— y queda en caché. Y como la entrada está *fresca* durante cinco
# minutos, Next no la revalida: sirve la versión vacía toda la corrida, que dura
# menos que eso. El resultado son veintitrés fallos que parecen de la aplicación y
# son del harness.
#
# Levantarla acá también es lo que hace que el build local se parezca al de
# producción, donde Vercel construye con Supabase disponible.
#
# Playwright la vuelve a declarar en `playwright.config.ts` con
# `reuseExistingServer: true`, así que la encuentra levantada y la reusa. Esa
# declaración sigue haciendo falta para quien corre `npx playwright test` a mano.
levantar_api_local() {
  local sonda="http://127.0.0.1:${LOCAL_API_PORT}/rest/v1/campaigns?select=id&limit=1"
  local registro="${TMPDIR:-/tmp}/e2e-api-local.log"

  if curl --fail --silent --show-error --output /dev/null "$sonda" 2>/dev/null; then
    say "La API local ya estaba levantada: se reusa"
    return
  fi

  say "Levantando la API local (hace falta para construir con datos)"
  node scripts/local-api.mjs > "$registro" 2>&1 &
  api_propia=$!

  # La sonda pide una tabla, no el puerto: que PostgREST escuche no significa que ya
  # haya leído el esquema, y un build contra un esquema sin leer falla igual.
  for _ in $(seq 1 60); do
    if curl --fail --silent --output /dev/null "$sonda" 2>/dev/null; then
      return
    fi

    if ! kill -0 "$api_propia" 2>/dev/null; then
      api_propia=""
      echo "La API local terminó antes de estar lista:" >&2
      cat "$registro" >&2
      exit 1
    fi

    sleep 1
  done

  echo "La API local no contestó en 60 s:" >&2
  cat "$registro" >&2
  exit 1
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

    # Después del reset, nunca antes: PostgREST cachea el esquema, y levantarlo contra
    # una base que está por recrearse lo deja hablando de tablas que ya no son ésas.
    levantar_api_local
  fi

  say "Construyendo el sitio en modo ${modo}"
  npm run build
  huella > "$HUELLA"
fi

say "Recorriendo los flujos críticos en modo ${modo}"
npx playwright test "$@"
