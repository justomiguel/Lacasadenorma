# Feature Specification: Novedades como diario de la obra

**Feature Branch**: `main` — se trabaja sobre `main`, directo, sin rama de feature
(constitución § Flujo de trabajo · Git).

**Created**: 2026-09-14

**Status**: Ready for implementation

**Input**: User description: "Ayúdame a hacer de novedades una entrada tipo blog. Que desde
admin se pueda subir novedades y que salgan con fechas y se vayan acumulando como un feed de
noticias. Que tengamos un editor tipo wysiwyg incorporado que nos permita subir imágenes,
videos, todo bien completo."

**Numeración**: los requisitos van de **FR-301** en adelante y los criterios de **SC-301** en
adelante. La feature 001 ya cubre publicar un avance (US3, FR-019…FR-024, FR-027, SC-009); esta
feature la convierte en un diario con entradas ricas, sin reabrir esas garantías.

---

## Por qué esto cambia algo que ya estaba decidido

`/novedades` ya existe: se escribe desde `/admin/novedades`, cada entrada tiene fecha de
publicación y slug compartible, y el cuerpo es Markdown restringido con las fotos **después**
del texto. Eso alcanza para un parte de obra. No alcanza para un diario:

1. Quien escribe tiene que saber Markdown. Desde el teléfono, con una foto en la mano, es
   fricción que SC-009 quería eliminar.
2. Las fotos no viven en el relato: van a un ensayo al final. Un video no entra.
3. El índice público es una grilla de previas, no un feed que se lee de arriba hacia abajo
   con la fecha como ancla.

Esta feature no inventa las novedades. Cambia **cómo se escriben** y **cómo se leen**.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escribir una novedad como se ve (Priority: P1)

La persona a cargo del proyecto entra a `/admin/novedades` desde el teléfono, escribe el avance
viendo negritas, listas y subtítulos como van a verse, le mete una foto del techo en el medio
del párrafo y un video corto de la colada, guarda, publica. En el sitio queda una entrada con
su fecha, su texto y los medios en el lugar donde los puso.

**Why this priority**: es el pedido. Si sólo se implementa esto, el diario ya se puede escribir.

**Independent Test**: iniciar sesión como `editor`, crear una novedad con título, texto con
formato, una foto con `alt` y un video con `alt`, publicarla, y abrir `/novedades/{slug}` sin
sesión: el HTML servido tiene la fecha, el texto y los dos medios, y no tiene un `<script>`
aunque se haya intentado pegar HTML en el editor.

**Acceptance Scenarios**:

1. **Given** una persona con rol de editor, **When** abre `/admin/novedades`, **Then** escribe
   el cuerpo en un editor visual (negrita, cursiva, subtítulo, lista, cita, enlace) y no tiene
   que conocer Markdown.
2. **Given** JavaScript deshabilitado en el backoffice, **When** abre el formulario, **Then**
   el cuerpo sigue siendo un área de texto que se envía por POST: publicar no depende del
   editor.
3. **Given** una novedad guardada, **When** inserta una foto desde el editor, **Then** tiene
   que escribir qué se ve (`alt`) antes de que la foto se suba, y la foto queda en el flujo
   del texto, no en una galería aparte.
4. **Given** una novedad guardada, **When** inserta un video MP4 o WebM desde el editor,
   **Then** también exige `alt`, el archivo se aloja en este proyecto (no en YouTube ni
   Vimeo) y en la página pública se reproduce con `<video controls>`, sin `iframe`.
5. **Given** un intento de pegar `<script>` o HTML crudo en el cuerpo, **When** guarda,
   **Then** el servidor rechaza el campo `body` y no se publica nada ejecutable (T4).
6. **Given** un SVG renombrado a `.mp4` o a `.png`, **When** se sube, **Then** se rechaza
   por el contenido del archivo, no por la extensión (T6).

---

### User Story 2 - Leer el diario de la más nueva a la más vieja (Priority: P1)

Alguien que ya ayudó o que está pensando en ayudar entra a `/novedades`. Ve las entradas de
la más reciente a la más antigua, cada una con su fecha, su título y un recorte del texto.
Abre una, la lee como un artículo, y la puede compartir por su URL.

**Why this priority**: es la mitad pública del pedido. Un editor que no se lee como diario no
cumple.

**Independent Test**: con al menos dos novedades publicadas en días distintos, abrir
`/novedades` y comprobar el orden cronológico inverso, las fechas visibles y que cada título
lleva a su artículo; abrir un artículo y comprobar que la fecha, el cuerpo y los medios
están en el HTML servido, sin JavaScript de aplicación.

**Acceptance Scenarios**:

1. **Given** varias novedades publicadas, **When** se abre `/novedades`, **Then** aparecen de
   la más reciente a la más antigua, cada una con su fecha de publicación, su título y un
   recorte del texto, acumulándose como un índice y no como una grilla de tarjetas.
2. **Given** una novedad con foto, **When** se lista, **Then** esa foto acompaña la entrada;
   si no hay foto, no se reserva un hueco de stock ni se inventa una imagen.
3. **Given** una novedad publicada, **When** se abre `/novedades/{slug}`, **Then** se lee
   como un artículo: título, fecha, cuerpo con los medios intercalados, y se puede compartir
   con vista previa propia (FR-027).
4. **Given** una novedad en borrador, **When** se pide su URL o se lista `/novedades`,
   **Then** no aparece: 404 por URL, ausente del índice (I7).
5. **Given** una novedad escrita antes de esta feature (Markdown sin nodos de media),
   **When** se abre, **Then** se sigue leyendo: las fotos adjuntas que no están intercaladas
   en el cuerpo se muestran después del texto, como hasta hoy.

---

### User Story 3 - Publicar sigue siendo un acto aparte (Priority: P2)

Guardar un borrador no lo pone en el sitio. Publicar pone fecha y lo hace visible. Despublicar
lo saca del índice y de la URL, y deja rastro.

**Why this priority**: ya está resuelto en 001 (SC-009). Se reafirma para que el editor visual
no fusione los dos pasos.

**Independent Test**: el flujo e2e actual de publicar una novedad sigue pasando, ahora contra
el editor.

**Acceptance Scenarios**:

1. **Given** un borrador con foto y video, **When** se guarda, **Then** no tiene camino
   público.
2. **Given** ese borrador, **When** se publica, **Then** `published_at` queda con la fecha
   real, aparece en `/novedades` y en el sitemap, y el registro de auditoría dice que se
   publicó una novedad.
3. **Given** una novedad publicada, **When** se despublica, **Then** vuelve a 404 y deja
   rastro.

---

### Edge Cases

- Un video de más de 50 MB se rechaza con un mensaje que pide bajarle el peso, no con un
  error de storage.
- Un `alt` de menos de diez caracteres, o que es el nombre del archivo, se rechaza igual que
  hoy para las fotos.
- Un enlace `javascript:`, `data:` o `http:` en el cuerpo no se vuelve clickeable: queda
  como texto (misma lista blanca que hoy: `https:`, `mailto:`, rutas internas).
- Insertar media en el formulario de **alta** (todavía no hay id) no está disponible: primero
  se guarda el borrador, después se intercalan foto y video. El editor lo dice.
- Si el cuerpo referencia un `media_id` que no está adjunto a esa novedad, ese nodo no se
  renderiza: no hay imagen rota ni URL inventada.
- YouTube, Vimeo, TikTok o cualquier `iframe` de terceros no se aceptan: el video se sube a
  este proyecto o no entra.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-301**: El backoffice MUST ofrecer un editor visual del cuerpo de la novedad, operable
  en viewport de 390 px, con negrita, cursiva, subtítulo (`h3`), lista, cita, enlace, foto y
  video.
- **FR-302**: El cuerpo MUST seguir almacenándose como el Markdown restringido del dominio,
  nunca como HTML. El editor es una superficie; el documento canónico es el mismo árbol de
  nodos que ya impide XSS (T4).
- **FR-303**: El formulario MUST degradar a un `<textarea>` nombrado `body` si no hay
  JavaScript, de modo que un POST sin el editor siga guardando.
- **FR-304**: Insertar una foto o un video MUST exigir `alt` de al menos diez caracteres que
  no sea el nombre del archivo, validado en el caso de uso y en la base (FR-024).
- **FR-305**: Los videos MUST alojarse en un bucket público propio (`videos`), con lista
  blanca `video/mp4` y `video/webm`, límite de 50 MiB, tipo detectado por contenido.
- **FR-306**: La página pública de una novedad MUST interpolar fotos y videos en el flujo del
  cuerpo. Los adjuntos no referenciados se siguen mostrando después, para no perder las
  entradas ya publicadas.
- **FR-307**: `/novedades` MUST listar las entradas publicadas de la más reciente a la más
  antigua, cada una con su fecha de publicación visible.
- **FR-308**: El HTML servido de índice y artículo MUST incluir el contenido principal sin
  JavaScript de aplicación (FR-025). El editor visual MUST NOT enviarse a las páginas
  públicas.
- **FR-309**: Toda inserción de foto o video MUST dejar rastro de auditoría colgado de la
  novedad, no del archivo.
- **FR-310**: No MUST existir un camino para incrustar un reproductor de terceros
  (`iframe`, oEmbed, URL de YouTube/Vimeo convertida en embed).

### Key Entities

- **Novedad (`updates`)**: entrada publicable con `slug`, `title`, `body` (Markdown
  restringido, ahora con nodos de figura y video), `published_at`.
- **Media (`media`)**: archivo de foto o video. `kind` (`photo` | `video`), `bucket_id`,
  `alt_text` obligatorio, medidas para reservar espacio.
- **Relación (`update_media`)**: qué archivos están adjuntos a qué novedad, y en qué orden.

## Success Criteria *(mandatory)*

- **SC-301**: Publicar un avance con una foto intercalada y un video corto toma menos de dos
  minutos desde un teléfono, medido en el flujo e2e de viewport móvil (extiende SC-009).
- **SC-302**: El índice público muestra al menos la fecha y el título de cada novedad
  publicada, en orden cronológico inverso, sin JavaScript.
- **SC-303**: Un `<script>` en el cuerpo, un SVG disfrazado de foto y un SVG disfrazado de
  video se rechazan con test unitario o de integración en rojo-antes-de-verde.
- **SC-304**: Lighthouse sobre `/novedades` y `/novedades/{slug}` no empeora el presupuesto
  de JS de aplicación: el editor no viaja al público.
- **SC-305**: axe limpio en `/admin/novedades`, `/novedades` y una novedad publicada, en 390
  px y en 1440 px.

## Assumptions

- El público de las novedades sigue siendo el de la campaña: castellano rioplatense, inglés
  con aviso de idioma original (ADR-023). El backoffice no se traduce.
- No hay comentarios, etiquetas, autores visibles ni paginación en esta versión: el volumen
  esperado es de decenas de entradas, no de miles.
- No hay transcodificación de video: se acepta lo que un teléfono exporta como MP4 o WebM.
- Las medidas de un video que no se puedan leer del encabezado se guardan como 1920×1080
  (proporción `aspect-wide`) para reservar espacio. El fotograma de portada no se
  inventa en el servidor: a partir de 005 / ADR-038 lo extrae el admin al subir.
- Guardar y publicar siguen siendo dos operaciones (001, US3). El editor no publica al
  guardar.
