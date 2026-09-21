# Listado del catálogo — inventario editorial

**Fecha:** 2026-09-20  
**Páginas:** `/catalogo` y `/en/catalogo`  
**No toca:** la ficha `/catalogo/[id]`, reservas, montos, RLS, ni el HTML público según sesión.

## Problema

`/catalogo` es una tabla de siete columnas también en el teléfono (ADR-044). En 390 px se desplaza de costado. El lead explica la tabla, el caption la vuelve a explicar, y dos columnas dicen «No» y «—» en casi todas las filas. La foto cabe en un pulgar: no se reconoce el objeto. En escritorio se escanea, pero cuesta más que en la ficha nueva.

## Decisión

El listado es un **inventario editorial**, no una tabla. Cada ítem es una fila: foto (si hay), título, una línea de hecho, el nombre público si alguien eligió aparecer, y «Quiero donar →». En escritorio, desde `lg`, la misma fila muestra el total a la derecha.

Esto enmienda ADR-044 y FR-209: en el teléfono ya no hay tabla ni scroll de costado. `/admin/catalogo` sigue siendo tabla (ADR-050).

La ficha no cambia. El muro y «Otras formas de ayudar» tampoco.

## Composición

### Teléfono (390 px primero)

1. `SiteHeader`.
2. `PageHeader`: título actual, lead corto (ver Copy).
3. Saltos a las categorías que tienen ítems, como `InlineLink` a `#materiales` y el resto. No son pills ni tabs. Sin pictograma inventado por categoría.
4. Por cada grupo de `groupCatalogByCategory`:
   - `SectionHeading` con el nombre de la categoría y el `id` que ya tiene.
   - Lista de filas. Cada fila:
     - Miniatura (`w-5xl`, la de hoy) si hay foto (subida o de referencia). Sin foto, no se reserva hueco (ADR-043).
     - Título: `InlineLink` a `/catalogo/{id}`.
     - Hecho: `Faltan {remaining}` y, si hay estimado, `· {monto}` (el de unidad).
     - Nombres públicos, si hay, con el % de ese ítem (`Ana donó el 40%`). Sin tomas: se omite la línea.
     - `SecondaryAction` «Quiero donar» a la ficha, o `Ya está cubierto.` si no queda nada.

### Escritorio (`lg` y más)

La misma página. Cada fila es una grilla: foto · texto (título, hecho, nombres) · total · donar.

- El hecho en escritorio suma `de {needed} {unit}`.
- El total es `netCoverAmount(unit, remaining)`, el de hoy. Debajo, voz baja: `estimatedUnit` (`estimado {amount}, no fijo`).
- Los saltos a categoría muestran las seis que existan, en una línea.

Abajo, sin cambio: `WallPreview` y el secundario a `/ayudar`.

## Copy

No se escribe prosa de campaña nueva. Se recorta lo que ya existe.

**Lead (es):** `Materiales y cosas que todavía hacen falta para reconstruir. El estimado no es un precio fijo.`

**Lead (en):** `Materials and things that are still missing to rebuild. The estimate is not a fixed price.`

Cómo se dona (traer o plata, cuenta, teléfono) vive en la ficha.

**Caption de la lista** (`listCaption`, reemplaza el uso de `tableCaption` en esta página):

- es: `Lo que falta, con una foto ilustrativa cuando hay una. El estimado no es un precio fijo. Las fotos no representan el objeto real.`
- en: `What is still needed, with an illustrative photo when there is one. The estimate is not a fixed price. The photos do not represent the real object.`

Los saltos usan `catalog.categories`. El `aria-label` del nav es una clave nueva, una línea: es `Ir a una categoría` / en `Jump to a category`.

«Quiero donar» sigue siendo `donateCta` / `donateCtaLabel`. El hecho reusa `remainingFact`, `remainingOf`, `namedShare`, `covered`. El monto sale de `formatCatalogEstimate`.

`columnTaken`, `takenYes`, `takenNo` y el em dash de precio no se usan en el listado.

## Estados

| Estado | Qué se ve |
|---|---|
| Foto de referencia | Miniatura junto al título. El caption de la lista dice que es ilustrativa |
| Foto subida | Esa foto; pisa la de referencia (ADR-043) |
| Sin ninguna | Título solo. MUST NOT reservar hueco |
| Con estimado | Monto de unidad en el hecho. En `lg`, también el total |
| Sin estimado | Se omite el dinero. No se escribe `$ 0` ni «—» (enmienda FR-214 en el listado) |
| Alguien apareció | `Ana donó el 40%`. «Quiero donar» sigue si queda algo (ADR-052) |
| Nadie apareció | No se escribe «No» ni «—» |
| Cubierto | `Ya está cubierto.` Sin botón y sin total |
| `?conflicto` | `ConflictNotice` arriba, como hoy |
| Lista vacía | `EmptyState` actual |
| Base caída | `Unavailable` actual |

## Componentes y datos

- `CatalogTable` pasa a ser `CatalogInventory` (`components/catalog/inventory.tsx`). El listado es una `<ul>`, no un `<table>`.
- `CatalogScreen` sigue agrupando por categoría. Encima de los grupos, el nav de saltos. Sigue usando `PageHeader`.
- Mismos casos de uso: `getCatalog`, `getCatalogClaims`, `getDonationWall`. No hay puerto ni tabla nueva.
- El HTML público sigue siendo idéntico con o sin sesión (ADR-037).
- `formatCatalogEstimate` no se muda.

Si `inventory.tsx` se acerca a 300 líneas, la fila se parte. No se sube `max-lines`.

## Accesibilidad

- Un `h1` (el del `PageHeader`). Las categorías son `h2`.
- La lista tiene nombre accesible (`listCaption`). Cada título es un enlace; «Quiero donar» tiene `aria-label` con el título del ítem.
- Los saltos son enlaces de página, no un menú nuevo de canales: sin marca inventada (ADR-047 no pide pictograma de «Materiales»).
- Objetivo táctil 44 px. Contraste 4.5:1. Foco visible. Sin desborde en 320 px.

## Tests

- `components/catalog/inventory.test.tsx` (reemplaza `table.test.tsx`):
  - No hay `table` ni `columnheader`.
  - Hay foto de referencia, foto subida, y ningún hueco si no hay foto.
  - Hay «Faltan» y «Quiero donar» a la ficha.
  - No está «¿La tomó alguien?», ni «No», ni un «—» de precio.
  - Con estimado: unidad y total. Sin estimado: no hay cifra.
  - Cubierto: sin donar y sin total.
  - Nombre público con %; toma parcial sigue ofreciendo donar.
- E2e `el listado es una tabla en teléfono…` pasa a afirmar inventario: foto, estimado, «Quiero donar», sin `columnheader`, página sin desborde en 360.
- `revision-visual` criterio 10 (desborde) sigue; se vuelve más fácil de cumplir. El número de huecos reservados de `/catalogo` no cambia: el listado no reserva.
- Flujos de reservar, conflicto y `volver` no cambian: el CTA sigue yendo a `/catalogo/{id}`.

## Documentación en el mismo trabajo

- Enmendar ADR-044: el listado público es inventario editorial; la tabla queda en `/admin/catalogo`. El estimado y «Quiero donar» no se van: cambian de celda a fila.
- Enmendar FR-209 y FR-214 en `specs/002-cuentas-y-catalogo-de-donaciones/spec.md`: listado no es tabla; sin estimado se omite, no se pone em dash.
- Una línea en `specs/001-sitio-publico-campana/ux.md` y en `docs/content-guide.md`.
- Copy en `content/es/catalogo.json` y `content/en/catalogo.json`. Esquema: se agregan `listCaption` y `categoryJumpLabel`. `tableCaption` queda en el JSON porque hoy el esquema lo exige; el listado no lo muestra.

## Fuera de alcance

- Rediseñar la ficha.
- Cambiar el modelo de reservas, estimados o RLS.
- Personalizar el HTML público al hidratar.
- Cards, pills, primaria por fila, foto más ancha que su archivo.
- Íconos nuevos por categoría.
- El backoffice.
