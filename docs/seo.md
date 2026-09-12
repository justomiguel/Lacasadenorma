# Descubrimiento: buscadores, respuestas y agentes

Este documento describe qué hace el sitio para que lo encuentren y para que lo entiendan: buscadores
clásicos (SEO), sistemas que responden preguntas citando fuentes (AEO) y modelos generativos que
resumen (GEO). No es una lista de buenas prácticas: es lo que está implementado, con el archivo donde
mirarlo.

El orden de prioridades del proyecto pone *discoverability* en el puesto ocho de diez. Eso importa
acá: nada de lo que sigue justifica empeorar la confianza, la humanidad, la simplicidad, la
accesibilidad o la velocidad. Cuando hubo conflicto, ganó el otro lado, y está anotado.

---

## 1. El primer requisito no es técnico

Para que un buscador cite una respuesta, la respuesta tiene que estar escrita. Nueve preguntas
concretas están en `content/es/preguntas.json` (y su par en `content/en/`), y el sitio las responde **en el HTML del servidor**:

1. ¿Qué es La Casa de Norma?
2. ¿Quién fue Norma?
3. ¿Qué pasó?
4. ¿Dónde queda Riacho He Hé?
5. ¿Cómo puedo colaborar?
6. ¿Para qué se va a usar el dinero?
7. ¿Cómo puedo verificar en qué se usó?
8. ¿Qué va a pasar cuando la casa esté reconstruida?
9. ¿Qué es Fundación Norma?

Que sean nueve no es una convención suelta: el esquema de contenido lo exige y falla el build si
falta una.

```ts
.min(9, "Las nueve preguntas del proyecto son un requisito (FR-001)");
```

Se renderizan en la home, en una lista de definiciones, **sin acordeón**. Un acordeón esconde ocho de
las nueve respuestas detrás de un clic, y una respuesta que hay que abrir es una respuesta que no se
extracta. `e2e/comun/home.spec.ts` verifica que las nueve preguntas y su primer párrafo estén
visibles, **incluso con JavaScript desactivado**.

Cada pregunta puede tener un `href` a la página que la desarrolla, así que la home responde en corto
y el sitio responde en largo.

---

## 2. Metadatos

Un helper único, `pageMetadata()` en `src/infrastructure/seo/metadata.ts`, arma título, descripción,
canónica, OpenGraph y Twitter a partir de cuatro datos. Que sea uno importa: doce páginas armando su
propio objeto `Metadata` es una garantía de que a alguna le va a faltar la canónica.

| Elemento | Dónde se define | Valor |
|---|---|---|
| `metadataBase` | `app/(es)/layout.tsx` y `app/(en)/layout.tsx` vía `rootMetadata()` | `new URL(getSiteUrl())` — todas las URLs relativas se resuelven contra él |
| Plantilla de título | `rootMetadata(locale)` | `"%s — La Casa de Norma"` |
| `alternates.canonical` | `pageMetadata()`, por página | La URL de **este** idioma (`/norma` o `/en/norma`) |
| `alternates.languages` | `pageMetadata()` | `es-AR`, `en`, `x-default` (el castellano) |
| `openGraph.type` | `pageMetadata()` | `website`, o `article` cuando hay `publishedTime` |
| `openGraph.locale` | `pageMetadata()` | `es_AR` o `en_US` |
| `openGraph.alternateLocale` | `pageMetadata()` | El otro idioma |
| `html lang` | El root layout de cada grupo de rutas | `es-AR` o `en` |
| `twitter.card` | `pageMetadata()` | `summary_large_image` |
| `robots` | Layouts públicos / `app/(es)/admin/layout.tsx` | `index, follow` en público; `noindex, nofollow, nocache` en todo `/admin` |
| `formatDetection.telephone` | `rootMetadata()` | `false`, para que iOS no convierta un CBU en un teléfono |

Ese último es un detalle que parece cosmético y no lo es: Safari en iOS detecta secuencias de dígitos
y las vuelve enlaces `tel:`. Un CBU de 22 dígitos convertido en enlace telefónico es un dato bancario
que la gente toca sin querer.

Dos rutas no tienen metadatos propios, y las dos son deliberadas:

- **La home** hereda los del layout, porque los del layout **son** los de la home. Repetirlos sería
  duplicar la fuente de la verdad.
- **`/admin`** declara sólo `robots`. No tiene título indexable porque no debe aparecer en ningún
  índice; el `noindex` es la única declaración que hace falta.

Las novedades usan `generateMetadata()` con el título y un extracto del cuerpo. Cuando el slug no
existe o el borrador no está publicado, devuelve `noIndex: true`: un buscador que rastrea un enlace
compartido antes de tiempo no deja indexada una página que todavía no debía existir.

`e2e/comun/compartir.spec.ts` recorre todas las páginas públicas y verifica `og:title`,
`og:description`, `og:locale`, `og:type`, `twitter:card` y la canónica. Un metadato que se rompe en
un refactor no es algo que se vea mirando la pantalla.

---

## 3. `sitemap.xml` y `robots.txt`

El sitemap sale de la **misma lista de rutas que la navegación del pie** (`PUBLIC_ROUTES` en
`components/site/navigation.ts`). Lista las dos versiones de cada página (`/` y `/en`, `/norma` y
`/en/norma`) con `alternates.languages`: `es-AR`, `en` y `x-default` al castellano. Las novedades
aparecen en los dos idiomas con el mismo slug; el cuerpo sigue en castellano (ADR-023).

Las novedades publicadas se enumeran en tiempo de ejecución con `listUpdates()`. La ruta revalida
cada 300 segundos, y publicar una novedad invalida `/sitemap.xml` explícitamente (ADR-017).

Dos cosas que el sitemap **no** trae, y son decisiones:

- **`changeFrequency`**. Es una declaración de intención que los buscadores ignoran desde hace años.
  Poner `weekly` en una página que no cambió en dos meses es ruido.
- **`lastModified` en las páginas editoriales.** Sólo lo llevan las novedades, donde hay una fecha
  real. Inventar `new Date()` para las demás diría "esta página cambió hoy" en cada build, que es
  falso y, peor, entrena al buscador a no creerle a la señal.

`robots.txt` permite todo el sitio público y bloquea `/admin` y `/api/`, apunta al sitemap y declara
el host. Bloquear la API es preferencia, no seguridad: la API es pública y cacheable a propósito,
pero no tiene nada que valga indexar.

---

## 4. Cómo se ve al compartir

La mayoría de la gente va a llegar desde WhatsApp. Esa es la vista previa que más importa, y la que
tiene las reglas más rígidas.

`app/(es)/opengraph-image.tsx` (y su par en `/en`) genera una imagen de 1200×630 con `ImageResponse`:

Es tipográfica por una razón concreta y no por estilo: la única foto disponible sería una de Norma o
de la casa, y una foto recortada a 1200×630 por un algoritmo, superpuesta con texto, en la tarjeta
que va a circular por WhatsApp, es exactamente el tipo de cosa que puede salir mal de una forma
irreparable. Un texto compuesto con cuidado nunca se ve indigno.

No hay imágenes OG por página. Todas heredan la del sitio. Una tarjeta distinta por página sería más
prolijo y también sería doce oportunidades más de que una salga mal.

`e2e/comun/compartir.spec.ts` verifica que la imagen responda 200 con un `Content-Type` de imagen.
Una tarjeta con imagen rota es peor que una sin imagen: WhatsApp muestra un rectángulo gris.

---

## 5. Datos estructurados

Todo el JSON-LD se arma en `src/infrastructure/seo/structured-data.ts` y se emite con un único
componente. La regla del proyecto es dura: **el JSON-LD no puede afirmar nada que la página no diga.**
Marcado que promete lo que la página no cumple es engaño, y además se penaliza.

| Tipo | Dónde | De dónde salen los datos |
|---|---|---|
| `Organization` | Todas las páginas | `content/{locale}/site.json` |
| `WebSite` | Todas las páginas | `content/{locale}/site.json` |
| `WebPage` | Home, `/norma`, novedades | Argumentos de la página |
| `FAQPage` | Home | Las mismas nueve preguntas que se ven en pantalla |
| `DonateAction` | Home | Apunta a `/ayudar` |
| `Person` | `/norma` | `content/{locale}/norma.json` |
| `Article` | `/novedades/[slug]` | La novedad publicada |
| `BreadcrumbList` | `/norma`, `/novedades/[slug]` | Sólo cuando hay dos niveles o más |

Lo que **no** se emite, y por qué:

- **`NGO`.** Fundación Norma todavía no existe como organización. Declararla sería afirmar una
  personería que no hay.
- **`Offer`, `AggregateRating`, `Review`.** No se vende nada y nadie califica nada.
- **`birthDate` y `deathDate` en `Person`.** No están publicadas porque la familia no las publicó.
  Un campo nulo es más honesto que un campo inventado a partir de una noticia.
- **`BreadcrumbList` de un solo nivel.** Un breadcrumb de un elemento no es una jerarquía.

Hay migas visibles sólo donde hay jerarquía real: la novedad tiene su enlace de vuelta al índice
arriba del título. En una estructura de doce páginas casi planas, una barra de migas en cada una
sería mobiliario decorativo.

---

## 6. Renderizado

El contenido se sirve desde el servidor. No hay ninguna página cuyo texto principal aparezca después
de un `fetch` del cliente, y esto no es sólo por los buscadores: es lo que permite que el sitio se
lea con la conexión de Riacho He Hé y con JavaScript desactivado.

| Ruta | Modo |
|---|---|
| `/norma`, `/que-paso`, `/legado`, `/riacho-conecta`, `/legales/*` | Estáticas en build: su contenido vive en el repositorio |
| `/`, `/ayudar`, `/transparencia`, `/reconstruccion`, `/novedades`, `/novedades/[slug]`, `/sitemap.xml` | ISR, `revalidate = 300`, más invalidación al publicar (ADR-017) |
| `/llms.txt` | `force-static` |
| `/api/health` | `force-dynamic`, `no-store` |
| `/admin/**` | Server-rendered, `private, no-store` |

Los 300 segundos son el número que resuelve la tensión entre dos cosas ciertas: que las cifras de
plata tienen que estar frescas, y que una difusión viral no debe convertirse en una consulta a la base
por visita (amenaza D1). La invalidación explícita al publicar es lo que hace que 300 segundos no
signifiquen "una novedad tarda cinco minutos en aparecer".

---

## 7. Rendimiento, que es parte de esto

Core Web Vitals son un requisito funcional del proyecto, no una optimización posterior, y también
son señal de ranking. Lo que está hecho:

- Dos tipografías variables, autoalojadas por `next/font` con subconjunto latino y `display: swap`:
  ningún pedido a un tercero y ningún origen más en la CSP. Se precargan las dos que se dibujan en la
  primera pantalla, y sólo esas: la itálica de la serif se declara aparte y baja recién cuando aparece
  un `<em>` ([ADR-018](./adr/018-presupuestos-de-performance.md)).
- Sin librería de componentes, sin librería de animación, sin librería de iconos. El bundle de
  cliente son unos pocos componentes interactivos: copiar un dato, cambiar de pestaña, compartir.
- `next/image` con AVIF y WebP, y calidades acotadas a dos valores.
- Espacio reservado para las fotos que todavía no existen, así que cuando lleguen no habrá salto de
  layout.
- Presupuestos y umbrales en `lighthouserc.json`, con Lighthouse en CI.

Medido sobre las nueve páginas, tres corridas cada una: las cuatro categorías entre 0,97 y 0,99, FCP de
0,76 s, CLS 0.

Cómo se corren está en [`testing.md`](./testing.md); de dónde salen los números de cada presupuesto, en
[`deployment.md`](./deployment.md) §8 y en [ADR-018](./adr/018-presupuestos-de-performance.md).

---

## 8. `/llms.txt`

`app/llms.txt/route.ts` sirve un texto plano, estático, cacheado una hora, y anunciado desde el
`<head>` con `<link rel="describedby" href="/llms.txt" type="text/plain">`.

No es un volcado del contenido. Dice, en prosa y en castellano: qué es la campaña, **qué es verdad
hoy y qué todavía no**, los enlaces de las páginas, los cinco endpoints públicos de lectura, y que
existen herramientas WebMCP.

La sección de "lo que todavía no es verdad" es la parte más importante del archivo. Un modelo que
resume el sitio va a ser preguntado por cosas que el sitio no afirma —cuánto se juntó, si la
fundación existe, cuándo termina la obra— y va a completar el hueco. Decirle explícitamente dónde
están los huecos es la única defensa disponible contra que los rellene solo.

**No hay `/llms-full.txt`**, y es una decisión. La variante "full" concatena el contenido entero; acá
el contenido entero son doce páginas que un modelo puede leer directamente, más cinco endpoints JSON
que dan las cifras mejor que cualquier prosa. Un archivo generado que duplique todo el sitio es una
segunda copia que se desactualiza, y una copia desactualizada de una rendición de cuentas es
exactamente el problema que el proyecto existe para no tener.

Para agentes que ejecutan herramientas en lugar de leer texto, ver [`webmcp.md`](./webmcp.md).

---

## 9. Qué hacer al agregar una página

1. Sumarla al grupo de navegación que corresponda en `components/site/navigation.ts`. Con eso entra
   al menú y al sitemap.
2. Exportar `pageMetadata({ title, description, path })`. La descripción se escribe pensando en el
   resultado de búsqueda: es una oración que alguien va a leer antes de decidir si entra.
3. Decidir si hace falta JSON-LD. Casi siempre no. Si hace falta, tiene que afirmar exactamente lo
   que la página dice.
4. Correr `npm run test:e2e`: los tests de compartir y de accesibilidad recorren todas las páginas
   públicas, así que la nueva queda cubierta por existir.
5. Si responde una de las nueve preguntas mejor que la home, apuntar el `href` de la pregunta ahí.

## Documentos relacionados

| Documento | Qué agrega |
|---|---|
| [`architecture.md`](./architecture.md) | Caché, ISR e invalidación en detalle |
| [`content-guide.md`](./content-guide.md) | Cómo se escribe el contenido que esto expone |
| [`webmcp.md`](./webmcp.md) | Las capacidades de lectura para agentes |
| [`testing.md`](./testing.md) | Accesibilidad, encabezados y Lighthouse en CI |
