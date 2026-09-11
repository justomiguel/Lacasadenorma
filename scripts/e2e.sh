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
#
# Ojo con el puerto ocupado: si ya hay una instancia escuchando, la que se levanta acá
# muere al hacer `bind` y la vieja se queda atendiendo. Por eso la sonda de abajo no
# pregunta si algo contesta, sino si lo que contesta ve el fixture.
# La sonda pide **la campaña del fixture**, no el puerto y no una tabla cualquiera.
#
# Los dos escalones intermedios engañan. Que el puerto escuche no dice que PostgREST
# haya leído el esquema. Y que una tabla conteste 200 no dice que conteste *filas*:
# PostgREST cachea el esquema, así que una instancia levantada antes del `reset` sigue
# respondiendo 200 sobre el esquema viejo y devuelve cero filas. Un build contra eso no
# falla —no hay error de red que registrar— y hornea las once páginas con la rama del
# dato ausente, que es el modo de falla más caro de diagnosticar que tiene este script.
api_local_ve_el_fixture() {
  local sonda="http://127.0.0.1:${LOCAL_API_PORT}/rest/v1/campaigns?select=slug&limit=1"

  curl --fail --silent "$sonda" 2>/dev/null | grep -q '"slug"'
}

levantar_api_local() {
  local registro="${TMPDIR:-/tmp}/e2e-api-local.log"

  if api_local_ve_el_fixture; then
    say "La API local ya estaba levantada y ve el fixture: se reusa"
    return
  fi

  # Algo contesta en el puerto pero no devuelve la campaña. Es una instancia vieja
  # —de una corrida anterior, con el esquema de antes del reset en su caché—, y
  # reusarla produce un sitio construido sin cifras. Se dice qué pasa y qué hacer, en
  # lugar de seguir y dejar el diagnóstico para después (principio XII).
  if curl --fail --silent --output /dev/null \
    "http://127.0.0.1:${LOCAL_API_PORT}/rest/v1/campaigns?select=slug&limit=1" 2>/dev/null; then
    echo "Hay una API local en el puerto ${LOCAL_API_PORT} que no ve la campaña del fixture." >&2
    echo "Es de antes del reset y tiene el esquema viejo en caché. Bajala y volvé a correr:" >&2
    echo "  fuser -k ${LOCAL_API_PORT}/tcp 54331/tcp" >&2
    exit 1
  fi

  say "Levantando la API local (hace falta para construir con datos)"
  node scripts/local-api.mjs > "$registro" 2>&1 &
  api_propia=$!

  for _ in $(seq 1 60); do
    if api_local_ve_el_fixture; then
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

  echo "La API local no contestó con la campaña del fixture en 60 s:" >&2
  cat "$registro" >&2
  exit 1
}

# ─────────────────────────────────────────────────────────────────────────────
# Y después de construir, mirar lo construido
# ─────────────────────────────────────────────────────────────────────────────
#
# Todo lo de arriba comprueba las *condiciones* del build: que la API esté, que vea el
# fixture, que la caché esté fría. Esto comprueba el **resultado**, que es lo único que
# no puede estar bien por casualidad.
#
# Hace falta porque el modo de falla es silencioso por diseño: cuando una lectura no
# trae nada, la página muestra la rama del dato ausente en lugar de romperse (FR-034).
# Es correcto en producción y es lo peor posible acá: el build termina en verde, el
# servidor arranca, y la corrida gasta seis minutos para devolver veinte pruebas rojas
# que parecen defectos de la aplicación y son del harness. Ya pasó.
#
# `data-figure` es la marca de las cifras del sitio. Aparece decenas de veces en las
# cuatro páginas cuando hay datos y **cero** veces cuando no hay: no depende del
# fixture, sólo de que la campaña tenga números que mostrar.
verificar_que_el_build_tiene_datos() {
  local sin_datos=()
  local pagina

  for pagina in index ayudar transparencia reconstruccion; do
    if ! grep -q 'data-figure' ".next/server/app/${pagina}.html" 2>/dev/null; then
      sin_datos+=("$pagina")
    fi
  done

  if (( ${#sin_datos[@]} > 0 )); then
    echo "El sitio se construyó sin una sola cifra: ${sin_datos[*]}." >&2
    echo "El build no leyó la base, así que las páginas estáticas quedaron con la rama" >&2
    echo "del dato ausente y los flujos 3, 4, 5 y 7 van a fallar en masa." >&2
    echo "Qué mirar, en este orden:" >&2
    echo "  1. curl 'http://127.0.0.1:${LOCAL_API_PORT}/rest/v1/campaigns?select=slug'" >&2
    echo "  2. rm -rf .next/cache && volvé a correr" >&2
    echo "  3. pkill -f local-api.mjs y volvé a correr, por si la API es de otra base" >&2
    exit 1
  fi
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

  # La caché de fetch se borra, y no es una limpieza por prolijidad.
  #
  # Next guarda **en disco** cada lectura de Supabase en `.next/cache/fetch-cache`,
  # porque el cliente lee por `fetch` y Next lo instrumenta. Las entradas viven la
  # ventana de `revalidate` —cinco minutos— y sobreviven al build siguiente: dos builds
  # separados por menos de eso hornean los mismos datos, y el segundo **no consulta la
  # base**. Si el primero corrió cuando la base estaba vacía —por ejemplo el de
  # `npm run verify`, o el de una corrida anterior que falló—, el segundo hornea las
  # once páginas con la rama del dato ausente aunque el fixture esté cargado y la API
  # contestando.
  #
  # Está medido: mismo fixture, misma API, mismo entorno, y la única diferencia entre
  # una página sin una sola cifra y la página completa fue borrar este directorio.
  rm -rf .next/cache/fetch-cache

  say "Construyendo el sitio en modo ${modo}"
  npm run build
  huella > "$HUELLA"

  if [[ "$modo" == "con-datos" ]]; then
    verificar_que_el_build_tiene_datos
  fi
fi

say "Recorriendo los flujos críticos en modo ${modo}"
npx playwright test "$@"
