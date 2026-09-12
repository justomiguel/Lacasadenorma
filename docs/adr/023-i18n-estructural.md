# ADR-023 · i18n estructural: castellano sin prefijo, inglés en `/en`

**Estado**: Aceptada · **Fecha**: 2026-09-12 · **Enmienda**: el último punto de
[ADR-014](./014-idioma.md) («la internacionalización queda fuera de alcance»).

## Contexto

La campaña recibe transferencias desde Argentina, Chile y Estados Unidos. El sitio, hasta acá, se
publica sólo en castellano rioplatense. Eso no es un olvido: ADR-014 lo dejó fuera de alcance a
propósito, porque un segundo idioma cuesta más que un archivo de traducción —toca las URLs, el
HTML `lang`, las canónicas, el sitemap, el bundle de cliente y la honestidad del contenido— y no
había por qué pagarlo antes de tener el sitio en pie.

Ahora sí hay que pagarlo, y conviene pagarlo **de una vez y en la estructura**, no agregando un
`if` por página. Si el inglés se suma como un árbol paralelo de copias, el tercer idioma (cuando
llegue) vuelve a costar lo mismo.

Tres restricciones que no se negocian:

1. **Las URLs en castellano no se tocan.** `/norma`, `/ayudar`, `/reconstruccion` ya se
   compartieron. Un redirect masivo a `/es/norma` rompería cada enlace de WhatsApp y cada canónica
   indexada (ADR-014).
2. **Ningún secreto de contenido en el cliente.** `"use client"` en el encabezado ya arrastró una
   vez los diez JSON y Zod entero al navegador (ADR-022). El cargador de contenido no puede volver a
   cruzar esa frontera.
3. **Ningún texto inventado, tampoco traducido a la ligera.** Una traducción genérica de la
   historia de Norma es peor que no tenerla: es copy de folleto sobre una persona muerta (§34). El
   inglés se escribe con el mismo criterio que el castellano, no con un traductor automático
   dejado correr.

## Decisión

### Idiomas

| id | HTML `lang` | OpenGraph | Prefijo | Estado |
| --- | --- | --- | --- | --- |
| `es` | `es-AR` | `es_AR` | ninguno | Completo. Es el idioma de origen. |
| `en` | `en` | `en_US` | `/en` | Completo en v1: chrome, editorial y legales. |

`en` y no `en-US` como id: el inglés no se regionaliza en el copy (no hay variante británica) y un
segmento `/en-US/` es ruido en la URL. El OpenGraph sí usa `en_US` porque el corredor de donación
que justifica el idioma es Estados Unidos.

Un tercer idioma se suma con una entrada en esa tabla, un directorio `content/{id}/` y un grupo
de rutas. No se toca el cargador.

### URLs

- Castellano: `/`, `/norma`, `/ayudar`. Sin prefijo.
- Inglés: `/en`, `/en/norma`, `/en/ayudar`.
- **Los slugs no se traducen.** `/en/reconstruccion`, no `/en/reconstruction`. Un slug por recurso
  es una canónica; dos slugs son dos URLs para la misma cosa y el mapa de «esta página en el otro
  idioma» se vuelve una tabla que se desactualiza. El inglés se lee en la página, no en la barra.

`/es` y `/es/{ruta}` redirigen en 308 a la versión sin prefijo, para quien adivine el patrón.

No hay negociación por `Accept-Language`. Un visitante argentino con el Chrome en inglés no se
merece que lo saquemos de la página que le compartieron. El idioma lo elige la URL, y la URL la
elige un enlace «English» / «Castellano» visible. Una cookie que recuerde la elección se puede
sumar después; no es estructura, es comodidad, y hoy no está.

### Árbol de rutas

Dos *root layouts* por [route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups),
que es lo que Next documenta cuando dos secciones de una app no pueden compartir el `<html>`:

```
app/(es)/layout.tsx          → <html lang="es-AR">
app/(es)/page.tsx            → /
app/(es)/norma/page.tsx     → /norma
app/(es)/admin/…           → /admin  (castellano, siempre)

app/(en)/layout.tsx          → <html lang="en">
app/(en)/en/page.tsx        → /en
app/(en)/en/norma/page.tsx  → /en/norma
```

Por qué no `app/[locale]/…` con un rewrite de `/norma` → `/es/norma`:

- El `proxy.ts` del sitio **no puede** correr en las páginas públicas. Hoy sólo cubre `/admin`, y
  eso es a propósito: un rewrite por Edge en cada visita a `/` rompe el caché compartido de las
  páginas estáticas (está escrito en el archivo). Un rewrite en `next.config` sin cookies sí
  conservaría el caché, pero `typedRoutes` dejaría de reconocer `/norma` como ruta, y cada
  `<Link href="/norma">` pasaría a ser una aserción.
- Dos root layouts dejan `/norma` y `/en/norma` como rutas reales. El `html lang` sale del layout
  que corresponde, **sin leer `headers()`**, y las páginas siguen siendo estáticas. Eso es lo que
  el presupuesto de Lighthouse necesita (ADR-022).

Las páginas no se duplican: el cuerpo vive en `components/screens/` y cada `page.tsx` es un envoltorio
de ocho líneas que fija el locale. Sumar un idioma es un directorio de envoltorios, no otra copia
de la home.

`/admin` y `/api` no se localizan. Quien administra es la familia y el backoffice está en
castellano. Un `/en/admin` no existe.

### Contenido

El contenido versionado (ADR-007) pasa a vivir **por idioma**:

```
content/es/*.json
content/en/*.json
```

El esquema Zod es el mismo. Un campo faltante en inglés rompe el build igual que en castellano:
no hay «si no está, mostramos el original». Una página con `lang="en"` y prosa en castellano es
una afirmación falsa para el lector de pantalla (WCAG 3.1.1) y un fallo silencioso (principio XII).

Las fotografías no se duplican. El archivo vive una vez en `public/fotos/`; lo que cambia por
idioma es el `alt`, el epígrafe y el título del tramo. Un test compara `url`, `width` y `height`
entre paquetes: si alguien recorta una foto y actualiza un solo JSON, el build lo dice.

Las **novedades** se escriben en castellano desde el backoffice y se publican en los dos idiomas
**tal cual**, con `lang="es-AR"` en el artículo cuando la página está en inglés. Traducir una
novedad operativa con un modelo, a las apuradas, es exactamente el dato no verificado que el sitio
se niega a mostrar. Cuando haya redacción en inglés, se suma como campo, no como magia.

### Chrome de la interfaz

Las cadenas que no son editorial —«Ayudar a reconstruir», «Copiar», «Ir al contenido», los nombres
de las secciones, las etiquetas de los landmarks— viven en `content/{locale}/ui.json`. El
encabezado, el pie, el sumario y la barra de ayuda las reciben **por props** desde el layout, que es
de servidor. Ningún componente de cliente importa `@/content`.

`content/index.ts` declara `import "server-only"`. Es la misma frontera que ADR-022 tuvo que
descubrir midiendo: si un `"use client"` vuelve a importar el contenido, el build falla en lugar de
inflar el bundle.

### Detección y SEO

Cada página pública declara:

- `html lang` correcto (por el root layout).
- `canonical` a **su** URL (`/norma` o `/en/norma`, no las dos).
- `alternates.languages`: `es-AR`, `en`, `x-default` (el castellano).
- `og:locale` y `og:locale:alternate`.
- `inLanguage` en el JSON-LD.

El sitemap lista las dos versiones de cada ruta y las novedades (en castellano, con su
`hreflang`).

`/llms.txt` se queda en castellano: es el documento para agentes sobre el proyecto, y el proyecto
se piensa en castellano. Un `/en/llms.txt` se puede sumar después; no es estructura, es un archivo.

### Qué no entra en este ADR

- **No hay `next-intl` ni `negotiator`.** La guía oficial de App Router alcanza para dos idiomas y
  un contenido que ya tenemos en JSON. Una librería que envuelve `Link` y el proxy resolvería el
  prefijo, y nos devolvería exactamente el middleware sobre páginas públicas que no queremos.
- **No se traduce el backoffice.**
- **No se traducen las herramientas de WebMCP.** Siguen en castellano. Un parámetro `locale` en las
  herramientas es un cambio de contrato y se especifica cuando un agente de verdad lo pida.
- **No se duplica Lighthouse.** Las nueve URLs de `lighthouserc.json` siguen siendo las
  castellanas. El inglés comparte plantilla, tipografía y fotos; si una regresión de peso aparece,
  aparece en las dos. Sumar nueve URLs duplica los once minutos del workflow por un idioma que
  todavía no es el de llegada.

## Alternativas descartadas

| Alternativa | Evaluación |
| --- | --- |
| Prefijo en los dos idiomas (`/es/norma`, `/en/norma`) | Rompe cada URL ya compartida. El 308 no repara un preview de WhatsApp que ya se mandó |
| `app/[locale]` + rewrite en el proxy | El proxy en páginas públicas fue descartado al escribirse, por el caché. ADR-022 depende de que las páginas públicas sigan siendo estáticas |
| `next-intl` con `localePrefix: 'as-needed'` | Resuelve el prefijo y el `Link`. Cobra un middleware en cada visita y una API de routing propia. Para dos JSON por idioma, no paga |
| Negociación por `Accept-Language` | Un argentino con el navegador en inglés aterrizaría en `/en` al abrir un enlace de WhatsApp en castellano. El idioma lo elige quien comparte, no el `q=` del browser |
| Slugs traducidos (`/en/what-happened`) | Dos canónicas por página y una tabla de equivalencias. El primer slug que se desincronice es un 404 con buen copy |
| Inglés sólo en chrome, editorial en castellano | `lang="en"` con prosa en castellano es un error de WCAG. O se traduce de verdad o no se publica la ruta |
| Dejar `html lang="es-AR"` y cambiarlo en el cliente | El lector de pantalla y el crawler leen el HTML servido. Un `useEffect` no es un idioma |

## Consecuencias

- Quien abre `/` sigue viendo exactamente lo que veía. El castellano no se mudó.
- Quien abre `/en` ve el mismo sitio en inglés, con el mismo recorrido, las mismas fotos y los
  mismos números. Los números se formatean con `en-US` (`$1,240,000` y no `$ 1.240.000`).
- El encabezado gana un enlace de idioma. No es un globo ni una bandera: es la palabra *English*
  o *Castellano*, en el idioma al que lleva. Una bandera no es un idioma, y el sistema de diseño
  no usa iconos de relleno (ADR-021).
- Los tests de Playwright sobre las URLs actuales siguen siendo la suite principal. Se suma una
  suite corta que afirma el `html lang`, los `hreflang` y que el conmutador cambia de idioma
  **sin cambiar de sección**.
- ADR-014 sigue vigente para el código, los commits y las tablas. Lo que deja de estar vigente es
  «el sitio se publica únicamente en castellano».
