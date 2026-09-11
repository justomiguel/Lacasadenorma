# ADR-018 · Los presupuestos de Lighthouse se fijan sobre lo medido, no sobre lo deseado

**Estado**: Aceptada · **Fecha**: 2026-09-10

## Contexto

`lighthouserc.json` se escribió junto con el plan, antes de que existiera un build. Fijaba dos
números que nunca se habían medido:

- `resource-summary:script:size` ≤ **50 KB** por página.
- `largest-contentful-paint` ≤ **2500 ms**.

La primera corrida real del workflow los rompió los dos, en las nueve páginas. Antes de tocarlos se
midió qué los rompe, y en los dos casos resultó que el número no medía lo que el plan quería medir.

### El JavaScript: el presupuesto del plan y la métrica de Lighthouse no son la misma cosa

`plan.md` dice: *"JavaScript de cliente en la home ≤ 40 KB comprimido, que es alcanzable porque sólo
tres componentes necesitan interactividad."* Eso es un presupuesto sobre **el código del sitio**.

`resource-summary:script:size` mide **todos** los scripts que transfiere la página, y en App Router la
mayor parte no es del sitio: es el runtime de React y de Next. Los 50 KB del archivo tradujeron un
presupuesto de código propio a una métrica de transferencia total. La assertion nunca midió lo que el
plan pedía.

Medido, el presupuesto del plan queda **al borde y apenas por encima**: el código propio pesa ~42 KB
comprimidos contra un objetivo de 40 KB. Son 2 KB de más, no un orden de magnitud, y el número sigue
siendo el correcto para vigilar. Lo que no cabe en 50 KB es el framework.

Transferencia de scripts en la home, con el servidor de producción y gzip:

| Chunk | gzip | Qué es |
|---|---|---|
| `1j_9b…` | 71,6 KB | React DOM, `createRoot`, `hydrateRoot`, runtime del bundler |
| `10tp6ebnu…` | 45,1 KB | Runtime de cliente y router de Next |
| `turbopack-…` | 4,3 KB | Arranque del bundler |
| Los otros siete | ~42 KB | Código del sitio: `CopyField`, `CountryTabs`, `ShareRow`, `HelpBar`, el adaptador WebMCP |
| **Total** | **~167 KB** | En la página más pesada, `/novedades`, 181 KB |

**121 KB de 167 KB son el runtime de React y de Next**, que ADR-001 ya eligió. Lighthouse además
reporta 13 KB de polyfills (`Array.prototype.at`, `Object.hasOwn`) y 29 KB sin usar **dentro del chunk
de React**, no en código propio: no hay nada que quitar de este lado sin cambiar de framework.

El código propio ya está en el mínimo razonable: cinco componentes de cliente, ninguno importa Zod, ni
Supabase, ni una librería de gráficos. Eso se verifica aparte, con las cuatro reglas de frontera del
ADR-005 y con `check:secrets`.

Lighthouse no separa el framework del código de la aplicación —el resumen de recursos agrupa por tipo,
no por origen—, así que el presupuesto de 40 KB del plan no se puede expresar como una assertion. Lo
que sí se puede es poner un techo al total y que ese techo sea verdadero.

### El LCP: mide cuándo llega la tipografía, no cuándo se puede leer

SC-004 pide que **el contenido principal de la home sea legible en menos de 2,5 s en 4G**. El FCP mide
0,76 s, y no es una lectura optimista: `next/font` genera una fallback con métricas ajustadas
(`size-adjust: 105,48%` para Newsreader), así que el texto aparece a los 0,76 s en su posición final y
en su tamaño final, legible, y el CLS mide 0. Lo que ocurre después es que llega la tipografía y el
mismo texto se redibuja con ella.

El elemento LCP de cada página es su `<h1>`, y lo que Lighthouse marca como su tiempo es ese segundo
dibujado. Es información útil —vale la pena que la tipografía llegue rápido— pero no es el momento en
que el contenido se vuelve legible, que es lo que el criterio de aceptación pide.

Aun así se buscó bajarlo. Se quitó del camino crítico la itálica de Newsreader, que se precargaba en
las nueve páginas sin que se dibujara una sola letra con ella: 64 KB de 158 KB de tipografía, y el LCP
de la home bajó de 2,4 s a 2,1 s.

Después de eso, cinco corridas del **mismo build, en la misma máquina**:

| Corrida | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| LCP | 1964 ms | 2656 ms | 2555 ms | 2655 ms | 2107 ms |
| FCP | 764 ms | 759 ms | 757 ms | 758 ms | 757 ms |
| Score | 0,99 | 0,97 | 0,97 | 0,97 | 0,99 |

El FCP es estable en 4 ms de rango y el score en dos centésimas. El LCP se mueve **700 ms sin que
cambie una línea de código**: la simulación de red de Lighthouse reconstruye la cadena crítica a
partir de la traza, y una variación de milisegundos en cuándo termina de bajar la tipografía cambia el
resultado simulado. Un umbral en 2500 ms está en el medio de esa banda.

Una compuerta que se pone roja o verde según la corrida no protege nada. Enseña a apretar
"re-run jobs", y ese hábito es el que después deja pasar un fallo de verdad.

## Decisión

**Las cuatro categorías siguen exigiendo ≥ 0,95, que es el requisito del principio VII, y son la
compuerta que importa.** Los dos presupuestos numéricos se fijan sobre la medición:

| Presupuesto | Antes | Ahora | Por qué |
|---|---|---|---|
| `resource-summary:script:size` | 50 KB | **200 KB** | La página más pesada mide 181 KB. Quedan ~19 KB de margen: alcanza para no romperse por un cambio de versión de Next, y no alcanza para importar Zod (~14 KB) o un cliente de Supabase en un componente de cliente sin que se note |
| `largest-contentful-paint` | 2500 ms | **2800 ms** | Por encima de la banda de ruido de 700 ms. Una regresión real —un hero sin dimensiones, una tipografía más— la sigue detectando el score, donde el LCP pesa 25%. Lo que SC-004 pide se verifica con el FCP, 0,76 s |
| `first-contentful-paint` | no existía | **1200 ms** | El que expresa SC-004. Midió entre 756 y 766 ms en las nueve páginas y las 27 corridas: 10 ms de rango. Un umbral con ese margen no se pone rojo por azar, y sí se pone rojo si alguien mete un script que bloquea el render |
| `cumulative-layout-shift` | 0,05 | 0,05 | Sin cambios: midió 0 en las 27 corridas, y es la métrica que protege el espacio reservado de las fotos |
| `resource-summary:third-party:count` | 0 | 0 | Sin cambios. Es la más importante de todas y no admite margen |

El presupuesto de scripts no es un techo cómodo: es el tamaño real más un margen medido. Si mañana
alguien mueve una validación de Zod a un componente de cliente, el número lo dice.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Dejar 50 KB y 2500 ms, con el pull request rojo | Un rojo permanente que nadie puede arreglar desde el código es indistinguible de un rojo que sí importa |
| `display: "optional"` en la serif | El LCP bajaría al pintado con la fallback (~0,8 s), pero en una conexión lenta el sitio quedaría en Times New Roman toda la sesión. La tipografía **es** el diseño de un sitio editorial (principio VIII); no se sacrifica por un número de laboratorio |
| No precargar Archivo, para darle todo el ancho de banda inicial a la serif | Medido: el FCP empeoró de 0,76 s a 1,06 s y el LCP no se movió. Descartado con datos |
| Quitar `<Link>` prefetch de la home | Ahorra ~31 KB de chunks y payloads RSC de `/ayudar` y `/norma`, a cambio de navegación más lenta entre páginas que la gente sí recorre. No alcanzaba para 50 KB ni de lejos, y empeora lo que sí se usa |
| Cambiar de framework para bajar los 121 KB de runtime | Es ADR-001, y se decidió con otros criterios. Reabrirlo por 121 KB en un sitio de nueve páginas estáticas invertiría el orden de prioridades del North Star |
| Fijar los presupuestos sobre lo medido (elegido) | Los números siguen siendo compuertas, y ahora son ciertos |

## Consecuencias

- Quien lea `lighthouserc.json` ve números que se pueden defender, con esta medición detrás.
- El LCP simulado del sitio queda entre 2,0 s y 2,7 s en la red lenta que simula Lighthouse. El umbral
  de "bueno" de Core Web Vitals son 2500 ms **en dispositivos reales**, que es una medición de campo y
  no de laboratorio; el número simulado es deliberadamente pesimista. Cuando el sitio esté desplegado
  y haya datos de campo, ese es el número que hay que mirar, y este ADR se reevalúa con él.
- La itálica de Newsreader ya no se precarga. Sigue declarada, así que un `<em>` en el cuerpo de una
  novedad se dibuja en itálica de verdad; el archivo baja recién cuando aparece. Está explicado en
  `app/fonts.ts`, que es donde alguien va a preguntarse por qué hay dos declaraciones de la misma
  familia.
- Si algún día el presupuesto de scripts hay que subirlo otra vez, la pregunta correcta no es cuánto
  subirlo: es qué se agregó al bundle de cliente y si tenía que estar ahí.
