# Lo que te anotaste a traer — foto y estado

**Fecha:** 2026-09-20  
**Páginas:** `/cuenta?seccion=reservas` y `/en/cuenta?seccion=reservas`  
**No toca:** la ficha, el listado público, cubrir con plata, el backoffice, RLS, ni Tu cuenta.

## Problema

Mis donaciones es una lista de texto: título, cantidad y una línea chica de vencimiento. No se reconoce el objeto. El estado de **tu** reserva está; el del **ítem** (si todavía falta, si ya está cubierto) no. Canceladas y vencidas ocupan el mismo lugar que las que todavía importan.

## Decisión

Cada reserva propia visible es una **fila de inventario**, el mismo ritmo que `/catalogo`: foto del tipo (si hay), título a la ficha, dos líneas de hecho — tu reserva y el ítem — y cancelar si sigue anotada.

Sólo se listan `reserved` y `fulfilled`. Canceladas y vencidas no aparecen. Teléfono y dirección no se muestran: eso ya lo tiene el equipo.

No hay puerto, tabla ni RLS nuevos. `listOwnPledges` sigue devolviendo todas; la pantalla filtra.

## Composición

### Teléfono (390 px primero)

1. El chrome de trabajo de hoy (`WorkSidebar` + `WorkNav`).
2. `SectionHeading` «Lo que te anotaste a traer» y el lead actual.
3. Lista de filas. Cada fila:
   - Miniatura (`w-5xl`, la del inventario) si hay foto. Sin foto, no se reserva hueco (ADR-043).
   - Título: `InlineLink` a `/catalogo/{id}`.
   - Hecho de la reserva: `{count} {unit}. {estado}`. Anotada: `Vence el {when}.` Llegada: `Llegó. Gracias.`
   - Hecho del ítem, si el ítem está publicado hoy: `Faltan {remaining}` o `Ya está cubierto.`
   - `SubmitButton` «Cancelar esta reserva» sólo si está anotada.

Si ya llegó:

```
[foto]  Heladera
        1 unidad. Llegó. Gracias.
        Ya está cubierto.
```

### Escritorio

La misma fila. No se suma columna de total: acá no se cubre con plata.

## Copy

No se escribe prosa nueva. Se reusa:

| Línea | Clave | Origen |
|---|---|---|
| Título y lead | `pledgesHeading`, `pledgesLead` | `cuenta.json` |
| Vacío | `pledgesEmpty` | `cuenta.json` |
| Cantidad | `pledgeQuantity` | `cuenta.json` |
| Tu reserva | `pledgeExpires`, `pledgeFulfilled` | `cuenta.json` |
| El ítem | `remainingFact`, `covered` | `catalogo.json` |
| Cancelar | `cancelPledge`, `cancellingPledge` | `cuenta.json` |

`pledgeExpired`, `pledgeCancelled`, `pledgeContact`, `pledgePhone` y `pledgeAddress` quedan en el JSON; esta pantalla no las muestra.

El caption del catálogo ya dice que la foto es ilustrativa. Acá el `alt` de la de referencia dice lo mismo. El lead no cambia.

## Quién entra a la lista

En dominio, al lado de `isActivePledge`: `isVisibleOwnPledge` — `reserved` o `fulfilled`.

Lo usan:

- `OwnPledges`, para pintar.
- `AccountScreen`, para `resolveAccountSection`: sin `?seccion=`, abre Mis donaciones sólo si hay alguna visible. Si sólo hay canceladas o vencidas, abre Tu cuenta.

`listOwnPledges` no filtra. El backoffice sigue viendo el historial completo.

## Foto

La misma función que el catálogo: `catalogItemPhotograph(subida, referencia)`.

1. Foto subida del ítem, si está publicado y tiene una.
2. Si no, foto de referencia del tipo (`catalog.referencePhotos[itemTitle]`). Vale aunque el ítem ya no esté publicado: el título de la reserva alcanza.
3. Si no hay ninguna, título solo. MUST NOT reservar hueco.

## Estados

| Situación | Qué se ve |
|---|---|
| Anotada, ítem publicado, falta | Foto · título · cantidad + vencimiento · `Faltan N` · cancelar |
| Anotada, ítem cubierto | Foto · título · cantidad + vencimiento · `Ya está cubierto.` · cancelar |
| Llegada | Foto · título · cantidad + «Llegó. Gracias.» · hecho del ítem si sigue publicado · sin cancelar |
| Ítem ya no publicado | Título y tu estado. Foto de referencia si el título la tiene. Sin segunda línea |
| Catálogo caído o no configurado | Igual que ítem ausente: reservas sí, hecho del ítem no, referencia por título si hay |
| Sin foto | Título solo. Sin hueco |
| Sólo canceladas o vencidas | Vacío de hoy + secundario al catálogo |
| Ninguna reserva | El mismo vacío |

## Componentes y datos

- `AccountScreen` pide `getOwnAccount` y `getCatalog` juntos. Si el catálogo no está `ok`, pasa lista vacía de ítems: las reservas no dependen de él.
- `PledgesPanel` / `OwnPledges` reciben las reservas y los ítems publicados, y juntan por `itemId`. El orden es el de `listOwnPledges` (más reciente primero), después del filtro.
- El título de la reserva (`itemTitle`) no se reemplaza por el del catálogo: es lo que la persona anotó. La unidad sí: si el ítem está publicado, se usa la suya; si no, `unidad`, como hoy.
- Cancelar sigue siendo `cancelOwnPledgeAction`.
- Si `own-pledges.tsx` se acerca a 300 líneas, la fila se parte. No se sube `max-lines`.

## Accesibilidad

- Un `h2` (el del panel). La lista no necesita caption nuevo: el heading nombra la sección.
- Cada título es un enlace. Cancelar es un envío con marca (basura) antes del nombre.
- Objetivo táctil 44 px. Contraste 4.5:1. Foco visible. Sin desborde en 320 px.

## Tests

- `src/domain/entities/donation-pledge` (o el test de `pledge-status` que ya cubre `isActivePledge`): `isVisibleOwnPledge` es verdadero en `reserved` y `fulfilled`, falso en `cancelled` y `expired`.
- `components/account/own-pledges.test.tsx`:
  - Anotada: foto, enlace a la ficha, cantidad + vencimiento, hecho del ítem, cancelar.
  - Llegada: «Llegó. Gracias.», sin cancelar.
  - Cancelada y vencida: no están.
  - Ítem ausente: título y tu estado; sin `Faltan` ni `Ya está cubierto.`; foto de referencia si el título la tiene.
  - Sin foto: ningún `img`.
  - Lista filtrada vacía: `pledgesEmpty` y el secundario al catálogo.
- `resolveAccountSection` no cambia de contrato. Quien lo llama pasa «hay visibles», no el largo crudo.
- E2e de reservar: además del heading de la sección, la fila tiene la foto del tipo y una línea de estado (vencimiento o `Faltan`). Cancelar y el conflicto no cambian.

## Documentación en el mismo trabajo

Una línea en `specs/002-cuentas-y-catalogo-de-donaciones/contracts/cuentas.md`: Mis donaciones es inventario (foto, tu reserva, el ítem); no lista canceladas ni vencidas. Abrir `/cuenta` sin query mira esa lista filtrada.

No entra ADR nuevo. No se toca el esquema de `cuenta.json`.

## Fuera de alcance

- Rediseñar la ficha o `/catalogo`.
- Mostrar cubiertos con plata en esta lista.
- El historial de canceladas y vencidas.
- Contacto, teléfono o dirección en la fila.
- Cambiar el modelo de reservas, vencimiento o RLS.
- El backoffice.
- Cards, pills, primaria por fila, foto más ancha que su archivo.
