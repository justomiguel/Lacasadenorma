# Aceptar antes de entregar

**Fecha:** 2026-09-20  
**Páginas:** `/admin/donaciones`, `/admin/donaciones/decidir/{id}/{si|no}`, `/cuenta` (Mis donaciones)  
**No toca:** el texto de `/catalogo`, Quiénes ayudaron salvo al entregar o revertir, cubrir con plata, ni el HTML público según sesión.

## Problema

«Sí: donan» y «llegó» son el mismo paso. El botón y el correo del equipo dicen que van a donar; `fulfill_donation_pledge` marca llegada, mueve el contador a entregado, manda «Llegó lo que trajiste» y puede publicar el nombre en el muro.

Eso choca con cómo se decide de verdad: primero alguien se anota, después el admin confirma que esa persona lo toma, y recién cuando el material está se puede decir que llegó.

El trabajo de hoy (deshacer el sí, revertir, plazo que avisa y no suelta) se apoya en esa fusión. Este diseño la parte sin tirar eso.

## Decisión

Un estado nuevo, `accepted`, entre reservada y entregada.

```
reserved ──accept──▶ accepted ──fulfill──▶ fulfilled
    │                     │                      │
    └─cancel              └─cancel               └─revert / cancel
                          (deshacer el sí)
```

1. **Reservar sigue sacando unidades** de lo que falta. Nadie más las puede tomar.
2. **Aceptar no vuelve a descontar.** Confirma el compromiso. Sigue en `reserved_quantity`. Pendiente de entrega.
3. **Cumplir es la llegada.** Ahí pasa a `fulfilled_quantity`, mail de gracias y muro.
4. **No se salta.** De `reserved` no se marca llegada.
5. **Nada se cancela solo.** El aviso de 14 días sigue siendo sólo para `reserved`.
6. En código el estado se llama `accepted`, no `taken`: `takenStatus` ya significa otra cosa en el catálogo.

`expired` sigue sin escribirse. Las filas que hoy están `fulfilled` siguen siendo entregadas: no se reescribe el historial.

## Estados

| Estado | Significado | Unidades | Público |
|---|---|---|---|
| `reserved` | Se anotó. El admin no confirmó que van a donar | Ya en `reserved_quantity` | El listado no cambia de texto |
| `accepted` | El admin confirmó que esa persona lo toma. Pendiente de entrega | Siguen en `reserved_quantity` | No dice que llegó |
| `fulfilled` | El admin confirmó que el material está | `fulfilled_quantity` | Mail de gracias, muro, «Llegó. Gracias.» en `/cuenta` |
| `cancelled` | Se soltó o se revirtió | Vuelven a pedirse | Sale del muro si estaba |
| `expired` | Sólo filas viejas | — | — |

- Quien reservó cancela la suya sólo si está `reserved`. No suelta `accepted` ni `fulfilled`.
- El equipo suelta `reserved` y `accepted` (motivo). Revierte `fulfilled` (como hoy). `cancel_donation_pledge` sobre `fulfilled` sigue existiendo para el enlace del mail.
- Cancelada no tiene salida.

## Pantalla

`/catalogo` no cambia de copy. «Ana donó el 40%» y «Ya está cubierto.» se quedan.

`/admin/donaciones`

En curso = `reserved` o `accepted`. Cerradas = entregada, cancelada, vencida vieja.

| Fila | Etiqueta | Acciones |
|---|---|---|
| Reservada | Reservada. Si pasaron 14 días: `Reservada · Pasaron 14 días` | «Sí: donan» y «Soltar la reserva» (motivo) |
| Aceptada | Tomada · pendiente de entrega | «Llegó» y «Soltar la reserva» (motivo) |
| Entregada | Entregada — deja de decir Donado | Revertir y Borrar |
| Cancelada | Cancelada | Sólo Borrar |

«Llegó» no pide nombre ni nota: eso se carga en el sí (camino por teléfono).

`/admin/donaciones/decidir/{id}/si|no`

El formulario de sí / no es **sólo** para `reserved`. Que `accepted` esté en curso en el panel no la vuelve a ofrecer acá: si no, el sí del mail volvería a parecer una llegada.

- `reserved` + sí: acepta. El copy («si van a donar, confirmalo») queda honesto.
- `reserved` + no: suelta.
- `accepted` + sí: no muta. Texto: ya está tomada, pendiente de entrega. El llegó se hace en el panel.
- `accepted` + no: formulario de soltar (deshacer el sí).
- `fulfilled`: soltar como ahora.

`/cuenta` · Mis donaciones

Se listan `reserved`, `accepted` y `fulfilled`. Cancelar la propia sólo si sigue `reserved`.

| Estado | Línea |
|---|---|
| Reservada | `Vence el {when}.` |
| Aceptada | `Pendiente de entrega.` Clave nueva `pledgeAccepted` en `cuenta.json` (es/en) |
| Entregada | `Llegó. Gracias.` |

## Datos

Sin tabla nueva. Sin tercer contador.

- `pledge_status` suma `accepted`.
- Columna `accepted_at`. Obligatoria si está `accepted`. En `fulfilled` se conserva. Al soltar se limpia, igual que `fulfilled_at`.
- El CHECK de llegada no cambia: `fulfilled_at` sólo si está `fulfilled`.
- `reserved_quantity` = suma de `reserved` **y** `accepted`. `fulfilled_quantity` = sólo `fulfilled`. Si `accepted` no entra en esa suma, las unidades desaparecen y el catálogo miente.

| Función | De → a | Contador |
|---|---|---|
| `accept_donation_pledge` (nueva) | reserved → accepted. Nombre y nota del teléfono, como hoy en el sí | No toca |
| `fulfill_donation_pledge` | **sólo** accepted → fulfilled. Sin nombre ni nota | reserved −, fulfilled + |
| `cancel_donation_pledge` | reserved o accepted → cancelled (dueño sólo reserved; admin+ las dos). fulfilled sigue pudiendo | reserved − si no había llegado |
| `revert_donation_pledge` | fulfilled → cancelled, como hoy | fulfilled − |
| trigger al borrar | accepted se trata como reserved | reserved − |

El tope de 5 reservas activas cuenta `reserved` + `accepted`.

Dominio: evento `accept`. `reserved + fulfill` lanza. `isActivePledge` = reserved o accepted. `isVisibleOwnPledge` = esas dos más fulfilled.

Puerto: `acceptPledge` al lado de `fulfillPledge`. Cumplir deja de recibir nombre y nota.

Auditoría: `pledge.accepted` → «confirmó que van a donar un artículo». `pledge.fulfilled` sigue siendo la llegada.

Métricas: `accepted` cuenta como en curso, no como «Llegó».

## Correos

No se agrega un mail nuevo. Al aceptar no se manda correo a nadie.

| Correo | Qué cambia |
|---|---|
| Anotación y recordatorio a quien reservó | Nada. El recordatorio sólo si sigue `reserved` |
| `pledge.fulfilled` | Sale al apretar «Llegó», no al sí |
| `pledge.reverted` | Sigue. Sólo sobre entregada |
| `staff.new_pledge` y `staff.phone_offer` | Dejan de decir «aparece como donado con la fecha de hoy». El sí confirma que van a donar; queda pendiente de entrega |
| `staff.pledge_expired` | Sigue siendo sólo `reserved`. Deja de hablar de llegada: pasaron 14 días y todavía no confirmaron que van a donar. Mismos enlaces sí / soltar |
| `staff.pledge_cancelled` | Nada. Cubre soltar reservada o aceptada |

Al soltar una aceptada, el equipo recibe la cancelación. Quien donó no recibe uno extra. El aviso a esa persona queda para revertir una entregada.

Destinos del mail: `/admin/donaciones/decidir/{id}/si` y `/no`. El GET no muta. Un fallo de correo no mueve el estado (FR-233).

## Errores

- Aceptar una que no está `reserved`: `no_encontrada`. No toca contadores.
- Cumplir una que no está `accepted`: `no_encontrada`. Acá se frena el salto.
- Soltar sin motivo siendo admin: inválido, no toca la base.
- Quien donó suelta una `accepted` o `fulfilled`: `sin_permiso`.
- Revertir algo que no está entregado: `no_encontrada`.

## Tests

El test va primero y falla por el motivo correcto.

- Dominio: `reserved + accept → accepted`; `accepted + fulfill → fulfilled`; `reserved + fulfill` lanza; `accepted + cancel → cancelled`; activas = reserved y accepted; visibles = esas dos más fulfilled.
- Postgres: aceptar no mueve cantidades; cumplir sí; `reserved_quantity` coincide con reserved + accepted; borrar una aceptada devuelve unidades; el donante no suelta una aceptada.
- Admin: En curso muestra las dos; «Llegó» sólo en aceptada; Cerradas dice Entregada, no Donado.
- `/cuenta`: pendiente de entrega sin «Llegó»; cancelar sólo si está reservada.
- Correo: `staff.new_pledge` y `staff.pledge_expired` ya no dicen que el sí publica donado ni que faltó la llegada. El de gracias no sale al aceptar.

## Documentación en el mismo trabajo

- `data-model.md` y `pledge-status.ts`: el diagrama con `accepted`.
- FR-260: el sí del equipo acepta; no cumple. La llegada es un segundo acto.
- Contrato de correos y ADR-033: «Llegó el material» sigue siendo `pledge.fulfilled`; el sí ya no es ese cierre.
- Specs de deshacer-sí y revertir no se reescriben: este documento las enmienda. Deshacer el sí queda sobre `accepted`. Revertir sigue sobre `fulfilled`.

## Fuera de alcance

- Rediseñar el inventario, la ficha o el muro.
- Cambiar el copy público de `/catalogo`.
- Un correo al aceptar.
- Borrar filas `expired` viejas.
- Hacer configurable la cantidad de días.
- Permitir `reserved → fulfilled` de un salto.
