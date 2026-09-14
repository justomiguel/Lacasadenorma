# Feature Specification: La portada de la novedad es el primer visual

**Feature Branch**: `main` — se trabaja sobre `main`, directo, sin rama de feature
(constitución § Flujo de trabajo · Git).

**Created**: 2026-09-14

**Status**: Ready for implementation

**Input**: User description: "Si se sube un video que tome el fotograma número 10
del video como portada de la noticia. Incluso para compartir por facebook o rrss
o que sea la primer imagen si es una imagen"

**Numeración**: los requisitos van de **FR-501** en adelante y los criterios de
**SC-501** en adelante. 003 y 004 cubren escribir y leer el diario. Esta feature
cambia **qué imagen representa** una entrada, en el sitio y al pegar el enlace.

---

## Por qué 004 no alcanza

004 dejó escrito, a propósito, que un video no hace de miniatura y que la
previa social es la tarjeta de la marca (ADR-036). Quien publica un avance que
es el video de la colada se encuentra las dos caras de esa decisión: el índice
no muestra nada de la obra, y Facebook muestra el símbolo.

El pedido es una excepción puntual, documentada en ADR-038.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir un video deja portada (Priority: P1)

Quien está en la obra graba un video corto, lo inserta en la novedad y no
elige un fotograma a mano. El décimo fotograma queda como tapa.

**Why this priority**: sin el JPEG no hay nada que mostrar ni al listar ni al
compartir. El resto de la feature deriva de acá.

**Independent Test**: como `editor`, en una novedad guardada, insertar un MP4
con `alt` de más de diez caracteres. El caso de uso recibe un JPEG `poster`
además del video. La fila de `media` queda con `kind = video` y
`poster_path` no nulo. El cuerpo nombra `video:<id>`; no nombra un segundo
medio.

**Acceptance Scenarios**:

1. **Given** una novedad guardada, **When** inserta un video, **Then** el
   cliente extrae el fotograma 10 (1-indexado) y lo manda como JPEG en el
   mismo `FormData`.
2. **Given** un video con menos de diez fotogramas, **When** se extrae la
   portada, **Then** se usa el último fotograma disponible.
3. **Given** el navegador no puede extraer ningún fotograma, **When** se
   sube el video, **Then** el video se guarda igual y `poster_path` queda
   nulo: no se inventa una imagen.
4. **Given** el JPEG de portada, **When** el servidor lo recibe, **Then** lo
   olfatea por contenido (T6), lee ancho y alto del encabezado, y lo guarda
   en el bucket `fotos` colgado de la fila del video. No crea una fila
   `media` extra.

---

### User Story 2 - El primer visual es la tapa del diario (Priority: P1)

En `/novedades` y en `/reconstruccion`, la entrada lleva una imagen: la
primera foto del relato, o el fotograma del primer video si no hay foto
antes.

**Why this priority**: es lo que se ve sin abrir la nota. Hoy un video al
inicio se saltea.

**Independent Test**: `coverPhoto` con un video al inicio del cuerpo y
póster presente devuelve la URL del JPEG; con una foto antes, la foto; sin
ninguna imagen, `null`.

**Acceptance Scenarios**:

1. **Given** el cuerpo nombra primero una foto, **When** se lista la
   entrada, **Then** esa foto es la tapa.
2. **Given** el cuerpo nombra primero un video con póster, **When** se lista
   la entrada, **Then** el fotograma es la tapa, aunque después haya una
   foto.
3. **Given** un video sin póster y una foto más tarde, **When** se lista,
   **Then** la foto es la tapa (el video sin imagen se saltea).
4. **Given** sólo un video con póster, **When** se abre el artículo,
   **Then** el `<video>` lleva `poster` con ese JPEG y el fotograma **no**
   aparece como figura suelta al final.

---

### User Story 3 - Compartir la nota muestra la tapa (Priority: P1)

Alguien pega `/novedades/{slug}` en Facebook, WhatsApp o X. Si la nota tiene
portada, esa imagen es `og:image`. Si no tiene, sigue la tarjeta del
símbolo.

**Why this priority**: el pedido nombra Facebook y redes. Una etiqueta que
apunta a un 404 o a la marca cuando hay foto de la obra no cumple.

**Independent Test**: `pageMetadata` con `image` usa esa URL en Open Graph y
Twitter; sin `image`, usa `/compartir/tarjeta`. Las páginas de
`PAGINAS_PUBLICAS` siguen exigiendo la tarjeta en e2e.

**Acceptance Scenarios**:

1. **Given** una novedad publicada cuya `coverPhoto` no es nula, **When** se
   pide el HTML de `/novedades/{slug}`, **Then** `og:image` y
   `twitter:image` son la URL absoluta de esa imagen.
2. **Given** una novedad publicada sin foto ni póster, **When** se comparte,
   **Then** `og:image` es `/compartir/tarjeta` (ADR-036).
3. **Given** `/norma`, `/ayudar` o el índice `/novedades`, **When** se
   comparte, **Then** siguen usando la tarjeta del símbolo. La excepción es
   sólo el artículo con portada.

---

### Edge Cases

- Un video subido antes de esta feature no tiene `poster_path`: no hay
  backfill. Se comporta como 004.
- Mandar un `poster` junto a una foto se ignora: una foto no tiene póster.
- Un `poster` que no es JPEG/PNG/WebP real se rechaza (T6) y la subida del
  video falla con el mensaje de archivo no soportado.
- Un slug de novedad que no existe (404) no usa una foto: no hay dato.
- El JPEG del fotograma puede no medir 1200×630. No se recorta ni se
  rellena: es el cuadro real del video.

## Requirements *(mandatory)*

- **FR-501**: Al insertar un video desde el admin, el cliente extrae el
  fotograma número 10 y lo envía como JPEG `poster` en el mismo alta.
- **FR-502**: Si hay menos de diez fotogramas, se usa el último. Si no se
  puede extraer ninguno, el video se guarda sin póster.
- **FR-503**: El servidor valida el `poster` por contenido, lo guarda en
  `fotos` y lo anota en `media.poster_path` / `poster_width` / `poster_height`.
  Una foto tiene esos campos nulos. El check de la base lo impone.
- **FR-504**: `coverPhoto` devuelve el primer visual del relato (foto o
  video con póster); si el cuerpo no nombra ninguno, el primer adjunto con
  imagen. Un video sin póster no cuenta.
- **FR-505**: El `<video>` público incluye `poster` cuando hay JPEG.
- **FR-506**: `og:image` / `twitter:image` de un artículo publicado con
  portada son esa portada. El resto de las URLs públicas sigue ADR-036.
- **FR-507**: El fotograma no es una fila de `media` extra: no aparece entre
  los adjuntos que el texto no nombra.

## Success Criteria *(mandatory)*

- **SC-501**: `coverPhoto` afirma foto-primero, video-con-póster-primero,
  video-sin-póster-se-saltea y video-solo-con-póster, en unitario visto en
  rojo antes.
- **SC-502**: El caso de uso `addUpdateMedia` persiste el `poster` de un
  video y no el de una foto, visto en rojo antes.
- **SC-503**: `pageMetadata` con `image` declara esa URL en Open Graph;
  sin `image`, `/compartir/tarjeta`. El e2e de `PAGINAS_PUBLICAS` sigue
  verde con la tarjeta.

## Assumptions

- No hay selector de portada ni recorte 1200×630. El cuadro es el del
  archivo o del fotograma.
- No hay transcodificación ni `ffmpeg` en el servidor.
- No se recorren videos viejos para extraerles el fotograma.
- TipTap no viaja al público. El presupuesto de JS de `/novedades` no
  cambia.
- El backoffice no se traduce.
