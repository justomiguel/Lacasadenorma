# Donantes en el catálogo — cara, nombre y cuánto

**Fecha:** 2026-09-20  
**Páginas:** `/catalogo`, `/en/catalogo`, `/catalogo/[id]`, `/en/catalogo/[id]`  
**Rutas nuevas:** `/catalogo/retrato/[id]`, `/en/catalogo/retrato/[id]`  
**No toca:** el muro `/quienes-ayudaron`, el backoffice, el HTML público según sesión, ni un interruptor aparte «mostrar foto».

## Problema

Quien abre el catálogo no ve con claridad quién ya tomó un bien. El nombre de quien eligió aparecer vive en una línea chica (`Ana donó el 40%`), sin cara. El retrato está prohibido en cualquier respuesta pública (FR-246, ADR-037). El % es la única cifra, también cuando el bien se cuenta en bolsas o unidades.

## Decisión

Si la persona eligió aparecer, el catálogo muestra **retrato (si hay), nombre y cuánto**, en el listado y en la ficha. Reserva o entrega: las dos. Lo anónimo no se nombra.

- Subir la foto no es consentimiento. El consentimiento es «aparecer».
- La cara se sirve por el id de la reserva, que ya es público. El bucket `avatares` sigue privado. El HTML no nombra `user_id` ni `{user_id}/retrato.jpg`.
- En cosas contables se habla en cantidad. En medidas, en % de ese ítem.

Esto enmienda FR-246, FR-255, ADR-037, ADR-052 y `docs/privacy.md`.

## Composición

Debajo del título y de «Faltan…» va una lista, no una tira de avatares. Cada persona es una línea:

1. Retrato rectangular (`w-2xl`, 48 px), recorte `object-cover`, **sin radio**. Antes del nombre. Sólo si `hasPortrait`.
2. Nombre.
3. Cifra: cantidad o %.

Varias personas: se apilan en el orden en que aparecieron. La fila del ítem crece. No hay tope.

La misma lista en el listado y en la ficha (`CatalogDonors`). En la ficha hay más aire; no cambia el orden. En 390 px vive bajo el título. Desde `lg`, en la columna de texto. No hay columna nueva de caras.

Ítem cubierto: las líneas quedan; «Quiero donar» se va. Nadie apareció: se omite el bloque. No se escribe «Nadie» ni «—».

El retrato del menú de trabajo sigue circular, de 128 px. Este no: es foto editorial chica, rectangular (FR-247).

## Cifra

| Unidad | Texto | Ejemplo |
|---|---|---|
| `unidad`, `bolsa`, `juego` | `{name} · {quantity} {unit}` | `Ana · 4 bolsas` |
| `metro`, `metro_cuadrado`, `metro_cubico`, `litro` | `{name} · {percent}` | `Ana · 40%` |
| Medida con % truncado a 0 | el nombre, sin cifra | `Ana` |

Una persona con dos reservas del mismo ítem se suma en una sola línea. La unidad se pluraliza con `unitLabel` (`1 bolsa` / `4 bolsas`). Cubrir el 100% no esconde la cifra: `Ana · 10 bolsas` o `Ana · 100%`.

El muro no cambia: sigue en % (ADR-042 / ADR-052 para plata y para especie en `/quienes-ayudaron`).

Copy: `namedShare` pasa a `{name} · {percent}` (es y en). Clave nueva `namedQuantity`: `{name} · {quantity} {unit}`. El hint de aparecer (`appearNamedHint` y el de `/cuenta`) dice que, si hay foto, también se ve la cara.

## Quién aparece

| Situación | Qué se ve |
|---|---|
| Eligió aparecer y tiene foto | Retrato + nombre + cifra |
| Eligió aparecer y no tiene foto | Nombre + cifra. MUST NOT reservar hueco ni inventar una cara |
| Anónima | Nada. Lo que falta baja igual |
| Reserva o entrega | Las dos, si eligió aparecer |
| Suelta, la vencen y la sueltan, o pasa a anónima | La línea se va. La ruta de esa foto da 404 |
| Borra la cuenta | La donación queda anónima (ya es así). La foto deja de servirse |
| Camino del teléfono, sin cuenta | Nombre si eligió aparecer; sin foto |
| Ítem cubierto | Las líneas quedan |
| `has_portrait` verdadero y el archivo no está | El `<img>` queda; es un desfasaje del disparador, no se tapa con JavaScript |
| Base caída / lista vacía | `Unavailable` / `EmptyState`, como hoy |

Sin JavaScript se ve lo mismo: HTML del servidor, `<img>` a la ruta pública.

## Foto, sin filtrar la cuenta

`anon` no lee `donor_profiles`. La vista no puede preguntar `portrait_path` (esa ruta **es** el `user_id`).

Se agrega `has_portrait boolean not null default false` en `donation_pledges`. Un disparador lo mantiene:

- al crear o actualizar una reserva no anónima: `has_portrait = (portrait_path is not null)` del perfil, o `false` si no hay `user_id`;
- al subir, cambiar o borrar el retrato: las reservas no anónimas de esa persona que el catálogo ya publica;
- al pasar a anónima: la fila sale de la vista; el boolean puede quedar, no se publica.

Sexta columna pública, las mismas reglas de ADR-030: el `grant` y la vista. `anon` **no** recibe `portrait_path` ni `user_id`. `donation_catalog_claims` proyecta `has_portrait`. El muro no.

`CatalogClaim` suma `hasPortrait`. `takenStatus` agrupa por nombre, suma cantidades y, para la foto, usa el `id` de la primera reserva de esa persona y el `hasPortrait` de esa agrupación.

Ruta `/catalogo/retrato/[id]` (y `/en/…`):

1. El servidor (no el cliente anónimo) carga la reserva por id.
2. Si no existe, es anónima, no está en un estado que el catálogo ya publica, o no hay archivo: 404, `Cache-Control: no-store`.
3. Si hay archivo: lo sirve con el mime, `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=60`. La URL firmada se pide, se usa y se descarta. El cuerpo y los headers no nombran `user_id`.

El `<img>` usa `next/image` con `width`/`height` 48, `alt=""` (el nombre está al lado). `src` es el href localizado de esa ruta. Si `hasPortrait` es falso, no hay `<img>`.

El HTML de `/catalogo` sigue siendo idéntico con o sin sesión (ADR-037 punto 1).

## Componentes y datos

- `CatalogDonors` (`components/catalog/donors.tsx`): la lista. La usan `CatalogInventory` y `CatalogItem`.
- `formatTakenNames` pasa a formatear cada línea (cantidad o %). Si el archivo se parte, la cifra vive al lado del componente.
- `getCatalogClaims` no cambia de puerto. Lee la sexta columna.
- Caso de uso nuevo para servir el retrato público, con test en rojo primero. El route handler no habla con Supabase: llama al caso de uso.
- Si `inventory.tsx` o `item.tsx` se acercan a 300 líneas, se parte. No se sube `max-lines`.

## Accesibilidad

- La lista de donantes tiene nombre accesible (clave nueva, una línea: es `Quién tomó esto` / en `Who claimed this`).
- El retrato no duplica el nombre: `alt=""`.
- Contraste 4.5:1. Foco visible en los enlaces que ya están (título, donar). Sin desborde en 320 px aunque la fila crezca.

## Tests

En rojo primero donde toca dominio, policies o la ruta.

- Dominio (`catalog.test.ts`, `taken-names`): cantidad en `unidad`/`bolsa`/`juego`; % en metro/litro/m²/m³; % truncado a 0 omite la cifra; dos reservas de la misma persona = una línea; anónima no llega.
- Inventario y ficha: retrato + nombre + cifra; sin `<img>` si no hay foto; varias personas; cubierto sin donar; nadie apareció = sin bloque.
- Ruta del retrato: 200 si aparece y tiene archivo; 404 si es anónima, no existe o no tiene archivo. El cuerpo no contiene un UUID de cuenta.
- pgTAP: `anon` lee exactamente las seis columnas públicas, incluida `has_portrait`, y no lee `portrait_path`. La vista sigue con `security_invoker`. El disparador pone `true` al subir foto y `false` al borrarla.
- E2e del catálogo: se ve el nombre de quien eligió aparecer. La foto se afirma en componente; el e2e no depende de un archivo binario.

## Documentación en el mismo trabajo

- FR-246: el retrato MUST NOT aparecer en el muro ni en una respuesta pública **salvo** en el catálogo, y sólo si esa persona eligió aparecer.
- FR-255: además del nombre, MUST mostrar el retrato si `has_portrait`, y la cifra según la unidad (cantidad contable / % medida).
- ADR-037 punto 2 y la alternativa «Foto en el muro»: el catálogo sí publica la cara; el muro no. El bucket sigue privado.
- ADR-052: la interfaz del catálogo ya no habla sólo en %. Contable = unidades; medida = %.
- `docs/privacy.md`: el retrato se publica en el catálogo cuando la donación no es anónima.
- Copy en `content/es|en/catalogo.json` y el hint de aparecer en cuenta.

## Fuera de alcance

- El muro `/quienes-ayudaron`.
- Un segundo permiso «mostrar foto» distinto de aparecer.
- Cards, pills, avatares circulares, tira superpuesta.
- Personalizar el HTML público al hidratar.
- Abrir el bucket `avatares`.
- El backoffice.
