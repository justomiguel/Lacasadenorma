# Feature Specification: El diario se lee donde está la obra

**Feature Branch**: `main` — se trabaja sobre `main`, directo, sin rama de feature
(constitución § Flujo de trabajo · Git).

**Created**: 2026-09-14

**Status**: Ready for implementation

**Input**: User description: "Agrega lo que haga falta de funcionalidad para el blog"

**Numeración**: los requisitos van de **FR-401** en adelante y los criterios de **SC-401**
en adelante. La feature 003 ya cubre escribir y leer el diario (FR-301…FR-310). Esta
feature no reabre el editor ni el documento canónico: completa lo que falta para que
el diario se use de verdad.

---

## Por qué 003 no alcanza

Se puede escribir una novedad con foto y video intercalados, y se puede leer el
índice. Faltan tres cosas que quien publica o quien sigue la obra se encuentra
el primer día:

1. El archivo tiene `caption` y `credit` desde 001, y la página pública ya los
   muestra. El formulario de inserción sólo pide `alt`. El epígrafe no se puede
   escribir.
2. Un medio ya adjunto no se puede volver a poner en el texto: hay que subirlo
   de nuevo o queda al final del artículo, fuera del relato.
3. `/reconstruccion` dice en el copy que las fotos del avance viven con cada
   novedad (`photosNote`, `seeNews`) y la pantalla no usa esas frases. Quien
   entra a la obra no ve el diario.

Esta feature no agrega comentarios, etiquetas, autores, paginación ni un
selector de portada para WhatsApp. La previa social de cada entrada ya es la
tarjeta de la marca (ADR-036). La foto de la entrada sirve para el índice y
para el recorte en la obra, no para el recuadro de 1200×630.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Describir y reutilizar un medio (Priority: P1)

Quien escribe el avance inserta una foto, dice qué se ve, y si quiere agrega un
epígrafe y un crédito. Más tarde puede volver a meter en el texto una foto que
ya está adjuntada, sin subirla otra vez.

**Why this priority**: sin esto el editor visual no está completo. El esquema
ya guarda esos campos; la superficie no los ofrece.

**Independent Test**: como `editor`, en una novedad guardada, insertar una foto
con `alt` de más de diez caracteres, epígrafe y crédito; guardar; abrir la
página pública: `figcaption` tiene el epígrafe y el crédito. Insertar de nuevo
esa misma foto desde la lista de adjuntos, sin elegir archivo: el cuerpo nombra
el mismo `media_id` dos veces y la página no duplica la foto al final.

**Acceptance Scenarios**:

1. **Given** una novedad guardada, **When** inserta una foto o un video,
   **Then** el formulario pide qué se ve (obligatorio) y ofrece epígrafe y
   crédito (opcionales, vacíos por omisión).
2. **Given** un medio ya adjunto a esa novedad, **When** lo elige desde la
   lista, **Then** queda intercalado en el cursor del editor y no se vuelve a
   subir el archivo.
3. **Given** una novedad publicada con epígrafe y crédito, **When** se abre
   `/novedades/{slug}`, **Then** la figura los muestra. Sin epígrafe ni
   crédito, no se reserva un hueco vacío.
4. **Given** un medio adjunto que el cuerpo no nombra, **When** se lee el
   artículo, **Then** sigue apareciendo después del texto, como en 003.

---

### User Story 2 - Ver lo último en la obra (Priority: P1)

Alguien entra a `/reconstruccion` para ver cómo va la casa. Si hay al menos
una novedad publicada, ve la más reciente —fecha, título, recorte, foto si
hay— y un enlace al diario. Si no hay ninguna, o si la base no está, esa
sección no aparece.

**Why this priority**: el copy de la página ya lo promete. El diario que no se
encuentra desde la obra no cumple el pedido de "blog".

**Independent Test**: con el fixture (dos novedades publicadas, la más nueva
"Empezó el montaje del techo"), abrir `/reconstruccion` y ver esa entrada y el
enlace a `/novedades`; sin base de datos, la página de reconstrucción no
menciona que no hay novedades.

**Acceptance Scenarios**:

1. **Given** al menos una novedad publicada, **When** se abre
   `/reconstruccion`, **Then** aparece la más reciente, con fecha y título, y
   un enlace al índice del diario.
2. **Given** esa novedad tiene una foto en el cuerpo, **When** se lista en la
   obra o en `/novedades`, **Then** esa foto —la primera del relato, no un
   video ni un adjunto que el texto no nombra— acompaña la entrada.
3. **Given** ninguna novedad publicada, o la fuente de datos no disponible,
   **When** se abre `/reconstruccion`, **Then** la sección del diario se omite:
   no hay un vacío que diga "cero entradas".
4. **Given** un borrador, **When** se abre `/reconstruccion`, **Then** no
   aparece (misma garantía I7 que el índice).

---

### User Story 3 - Seguir el diario por fuera del sitio (Priority: P2)

Quien quiere enterarse sin entrar cada día puede suscribirse al feed. El feed
lista las mismas entradas publicadas que `/novedades`, de la más nueva a la más
vieja, con título, fecha, recorte y enlace. Un borrador no entra.

**Why this priority**: es lo que hace de un diario un canal, no una página
suelta. No es lo primero que se escribe, sí lo primero que se comparte a quien
ya ayudó.

**Independent Test**: `GET /novedades.xml` con el fixture incluye "Empezó el
montaje del techo" y "Se retiraron los escombros", no incluye "Borrador que no
tiene que aparecer", y el índice declara el feed como `application/rss+xml`.

**Acceptance Scenarios**:

1. **Given** novedades publicadas, **When** se pide `/novedades.xml`, **Then**
   el documento lista esas entradas en orden cronológico inverso, con título,
   fecha, recorte y URL canónica en castellano.
2. **Given** un borrador, **When** se pide el feed, **Then** no está.
3. **Given** `/novedades`, **When** se mira la metadata, **Then** hay un
   `rel="alternate"` al feed. El feed no viaja JavaScript de aplicación.

---

### Edge Cases

- Epígrafe o crédito vacíos se guardan como ausencia, no como cadena vacía.
- Un crédito no reemplaza al `alt`: el `alt` sigue siendo obligatorio y no
  puede ser el nombre del archivo.
- Reinsertar un medio que ya está en el cuerpo no lo duplica al final del
  artículo (`referencedMediaIds` ya deduplica).
- Si la primera referencia del cuerpo es un video, la miniatura del índice es
  la primera foto del cuerpo; si no hay foto, no hay miniatura.
- El feed escapa `&`, `<` y `>` del título y del recorte. No incrusta HTML del
  cuerpo.
- `/reconstruccion` no adelanta el JavaScript de otras páginas: el enlace al
  diario y a la entrada no hace prefetch.
- No hay feed en inglés con cuerpo traducido: las novedades se escriben en
  castellano (ADR-023). Un solo `/novedades.xml`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-401**: Al insertar una foto o un video, el backoffice MUST ofrecer
  epígrafe y crédito opcionales, además del `alt` obligatorio (FR-024).
- **FR-402**: Un medio ya adjunto a la novedad MUST poder intercalarse en el
  cuerpo sin volver a subirse.
- **FR-403**: La página pública MUST mostrar epígrafe y crédito cuando existen,
  y omitir el `figcaption` cuando no.
- **FR-404**: `/reconstruccion` MUST mostrar la novedad publicada más reciente
  cuando exista, y omitir esa sección cuando no exista o cuando la fuente no
  esté disponible (FR-034).
- **FR-405**: La miniatura de una entrada en el índice y en la obra MUST ser la
  primera foto nombrada en el cuerpo; si no hay, la primera foto adjunta; si
  no hay foto, no hay miniatura. Un video no hace de miniatura.
- **FR-406**: El sitio MUST exponer un feed RSS en `/novedades.xml` con las
  novedades publicadas, sin borradores, sin JavaScript de aplicación.
- **FR-407**: El índice `/novedades` MUST declarar el feed como alternativa
  (`rel="alternate"`, `application/rss+xml`).
- **FR-408**: El editor visual MUST NOT enviarse a `/reconstruccion` ni al feed
  (misma frontera que FR-308).

### Key Entities

- **Novedad (`updates`)**: sin columnas nuevas. La miniatura se deriva del
  cuerpo y de los adjuntos.
- **Media (`media`)**: `caption` y `credit` ya existen; esta feature los
  vuelve editables al insertar.
- **Relación (`update_media`)**: la lista de adjuntos es la biblioteca de
  reutilización, no un segundo ensayo.

## Success Criteria *(mandatory)*

- **SC-401**: Insertar una foto con epígrafe y reutilizarla en el texto se
  completa en el mismo flujo de publicación de SC-009, sin salir de la
  novedad.
- **SC-402**: Con al menos una novedad publicada, `/reconstruccion` muestra su
  título en el HTML servido, sin JavaScript. Sin novedades o sin base, no
  afirma que el diario está vacío.
- **SC-403**: El feed lista exactamente las novedades publicadas del fixture
  (dos) y ninguna más, verificado en e2e con datos.
- **SC-404**: Lighthouse sobre `/reconstruccion` y `/novedades` no empeora el
  presupuesto de JS de aplicación: el teaser no hace prefetch y el feed no
  carga el editor.

## Assumptions

- No hay selector de portada: la primera foto del relato es la miniatura.
  La previa social de **esta** feature sigue siendo la tarjeta de la marca
  (ADR-036). 005 / ADR-038 exceptúan el artículo que sí tiene portada.
- No hay teaser en la home: la home es el relato de cinco momentos (ADR-032) y
  un sexto bloque pelearía el LCP (SC-001, SC-304).
- Un video sin fotograma extraído no genera miniatura (003). El fotograma 10
  al subir es 005, no esta feature.
- No hay comentarios, etiquetas, autores visibles, paginación, YouTube, ni
  vínculo a un ítem del catálogo o a un hito: eso es otra spec.
- El copy `photosNote` y `seeNews` de `/reconstruccion` ya existe; esta
  feature lo usa.
