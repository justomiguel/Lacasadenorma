# Ficha de ítem del catálogo — foto, etiqueta y dos caminos

**Fecha:** 2026-09-20  
**Páginas:** `/catalogo/[id]` y `/en/catalogo/[id]`  
**No toca:** el listado `/catalogo`, reservas, montos, ni el HTML público según sesión.

## Problema

La ficha es un `PageHeader` de página interior más las columnas de la tabla pasadas a prosa. En el teléfono el primer pantallazo es el título en display; la foto queda abajo. Después vienen «Faltan 3080 de 3080 unidades» y «¿La tomó alguien? No. Nombre —». El estimado y el formulario aparecen detrás de un párrafo largo. En escritorio es la misma columna angosta. No se reconoce el objeto, no se ve cuánto falta y no se ve cómo donar en el mismo pantallazo.

## Decisión

El primer pantallazo muestra el objeto, cuánto falta y cómo donar.

- **Móvil (E · Etiqueta).** La foto es la página: a sangrado, debajo del nav. Abajo, como etiqueta de museo: epígrafe, título, cuánto falta, dos caminos.
- **Escritorio desde `lg` (E2 · Foto y etiqueta).** Foto a la izquierda, a la proporción del archivo, sin estirar más que el archivo. A la derecha, la misma etiqueta. El formulario sigue en esa columna.

Los cuatro radios (traer / transferencia / Mercado Pago / PayPal) no pelean el primer pantallazo. Hay dos caminos, con marca antes del nombre, como en `/ayudar`: **Traer el mismo bien** y **Cubrir con plata**. Plata abre los tres medios, un medio a la vez.

El botón de enviar viaja con los campos que pide ese camino. Nunca queda arriba de un dato obligatorio.

## Composición

### Teléfono (390 px primero)

1. `SiteHeader`.
2. Foto a sangrado (o el hueco reservado en el mismo lugar). Epígrafe de una línea debajo, en el margen del texto.
3. Título del ítem: `h1`, `text-heading` / `font-display`. No se usa `PageHeader`.
4. Hecho: `Faltan {remaining}` en cuerpo fuerte. Debajo, voz baja: `de {needed} {unit}` y, si hay estimado, `· estimado {monto}`.
5. Nombres públicos, si los hay, con el % de ese ítem (`Ana donó el 50%`). Sin tomas: se omite la línea. No se escribe «¿La tomó alguien?».
6. Dos caminos (ver «Caminos»).
7. Debajo del pliegue: descripción (si hay), panel del camino elegido, `Volver al listado`.

La descripción no entra en el primer pantallazo: siempre va debajo de los caminos, en el panel. Así un título largo no pelea con Traer / Cubrir.

### Escritorio (`lg` y más)

Grilla de dos columnas. Izquierda: foto (o hueco) a ancho de columna, altura automática, proporción del archivo. Derecha: etiqueta + caminos + panel. `Volver al listado` debajo de la grilla, a todo el ancho de la medida.

La foto no se recorta para llenar la altura de la columna. Si la etiqueta es más alta, la foto queda arriba a la izquierda.

## Caminos

Mecanismo: un grupo de dos radios con el aspecto de `HelpPaths` (marca, nombre, flecha, regla entre ellos). No son pills ni tabs. Default: traer.

Sin JavaScript lo resuelve `:has()`, igual que hoy:

- Traer (`bring`): panel con lead corto + `OfferForm` o `ClaimForm` (sesión al hidratar, ADR-051 / ADR-037).
- Cubrir con plata (`money`): lead de plata + los tres medios (transferencia, Mercado Pago, PayPal) como radios. Los datos de un medio se ven sólo cuando ese medio está elegido.

El envío (traer) o los datos bancarios / links (plata) viven en el panel, no en la etiqueta.

Ítem cubierto: no hay caminos ni panel. La etiqueta dice `Ya está cubierto.` Los nombres públicos, si hay, quedan.

## Copy

No se escribe prosa de campaña nueva. Se recorta y se parte lo que ya existe.

- El párrafo largo de `coverLead` no va arriba. El aviso de que el estimado no es precio fijo es la línea `estimado {monto}` de la etiqueta. Si no hay estimado, esa parte se omite; no se muestra `$ 0`. `coverNoEstimate` queda en el panel de plata.
- `coverTitle` («Cómo donar esto») no abre el primer pantallazo. Los dos caminos son el cómo.
- `quantityOf` se parte en el hecho (`Faltan {remaining}`) y la línea baja (`de {needed} {unit}`). Claves nuevas en `catalogo.json` (es + en) si no se puede componer sin ambigüedad.
- `columnTaken` / `takenYes` / `takenNo` no se usan en la ficha. El listado no cambia.
- `backToList` sigue siendo `SecondaryAction`.

## Estados

| Estado | Qué se ve |
|---|---|
| Foto de referencia | Foto + epígrafe de ilustrativa + crédito |
| Foto subida | Esa foto; pisa la de referencia (ADR-043) |
| Sin ninguna | `ReservedSpace` en el lugar de la foto |
| Sin estimado | Se omite el estimado de la línea |
| Cubierto | Foto + título + `Ya está cubierto.` + nombres si hay. Sin caminos |
| `?conflicto` / `?reservado` | Avisos actuales, arriba de la ficha, fuera de la etiqueta |
| Base caída | `Unavailable`, como hoy |
| Id inválido / no publicado | `notFound()`, como hoy |

## Componentes y datos

- `CatalogItemScreen` deja de renderizar `PageHeader` cuando hay ítem. El `h1` sale de `CatalogItem`. El título de pestaña / Open Graph no cambia: sigue siendo el del ítem.
- `CatalogItem` se parte en foto (o hueco), etiqueta y caminos. No importa `src/infrastructure`.
- `HowToDonate` deja los cuatro radios del primer pantallazo. Expone dos caminos y, en plata, tres medios.
- Mismos casos de uso: `getCatalogItem`, `getCatalogClaims`, `claimItemAction`, `startDonateAction`. No hay puerto ni tabla nueva.
- El HTML público sigue siendo idéntico con o sin sesión (ADR-037).

## Accesibilidad

- Un solo `h1`: el título del ítem.
- Los dos caminos y los tres medios son radios con `label` visible. La marca no reemplaza el nombre (ADR-047).
- Objetivo táctil 44 px. Contraste 4.5:1. Foco visible. `prefers-reduced-motion`.

## Tests

- `components/catalog/item.test.tsx`: foto de referencia, foto subida y hueco siguen. El título es `h1`. Está «Faltan». No está «¿La tomó alguien?». Cubierto sin caminos.
- Composición: en el markup la foto (o el hueco) va antes del `h1`; existe la grilla `lg` y no hay card.
- `HowToDonate`: primer pantallazo = Traer y Cubrir con plata. Los tres medios no se ven hasta Cubrir. El botón no está antes de un campo required.
- E2e de reservar, crear cuenta y `volver` no cambian de flujo: `/catalogo/{id}` y el mismo POST.
- `check:iconos`: marca antes del nombre en los dos caminos y en cada medio.
- `revision-visual`: esta ruta ya no cuenta un `PageHeader`. Actualizar el número exacto si lo mide.

## Documentación en el mismo trabajo

- Enmendar ADR-044: en la ficha, el primer pantallazo son dos caminos, no cuatro radios. El listado no cambia. Sin JavaScript sigue `:has()`.
- Una línea en `specs/001-sitio-publico-campana/ux.md` y en `docs/content-guide.md` sobre la ficha (foto primero, etiqueta, dos caminos).
- Copy en `content/es/catalogo.json` y `content/en/catalogo.json`.

## Fuera de alcance

- Rediseñar `/catalogo`.
- Cambiar el modelo de reservas, estimados o RLS.
- Personalizar el HTML público al hidratar más de lo que ya hace `ClaimForm`.
- Foto más ancha que su archivo, recorte forzado, cards, pills, `PageHeader` en esta ruta.
