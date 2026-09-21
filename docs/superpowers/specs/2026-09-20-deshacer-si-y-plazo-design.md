# Deshacer el sí y plazo sin soltar solo

**Fecha:** 2026-09-20  
**Páginas:** `/admin/donaciones` y `/admin/donaciones/decidir/{id}/{si|no}`  
**No toca:** la ficha pública, el listado del catálogo, Quiénes ayudaron salvo al soltar, ni el HTML público según sesión.

## Problema

«Sí: donan» cierra la reserva. Pasa a Cerradas, cuenta como cubierto y, si hay nombre, aparece en Quiénes ayudaron. El equipo no puede deshacerlo: sólo borrar, que saca la fila. Si se arrepienten, el ítem no vuelve a la lista.

A los 14 días, `release_expired_holds` marca vencida y devuelve las unidades **solo**. El correo `staff.pledge_expired` (si llegara a mandarse) dice que el ítem ya volvió y que no hace falta hacer nada. Eso choca con cómo se decide: el sí y el no los marca el admin.

## Decisión

1. **Donado se puede soltar.** `fulfilled` admite `cancel` → `cancelled`. El ítem vuelve a faltar. El muro la pierde. El rastro queda. Borrar sigue existiendo para sacar la fila.
2. **Nada se cancela solo.** El plazo de 14 días no cambia el estado ni los contadores. `release_expired_holds` deja de llamarse (claim, aviso por teléfono, `pg_cron`).
3. **A los 14 días, un mail al equipo.** `staff.pledge_expired` avisa que pasaron los días y no confirmaron llegada. Un solo envío. Los mismos dos enlaces de sí / soltar. El ítem **sigue reservado** hasta que el admin actúe.

Quien reservó sigue pudiendo cancelar la suya en `/cuenta`. Eso no es automático.

## Estados

```
reserved ──fulfill──▶ fulfilled ──cancel──▶ cancelled
    ├────cancel───▶ cancelled
    └────expire───▶ expired   (no se escribe más)
```

- `cancel_donation_pledge` acepta **reserved o fulfilled**. Si estaba reservada, baja `reserved_quantity`. Si estaba donada, baja `fulfilled_quantity`. En los dos: `cancelled`, motivo, `cancelled_at`. `fulfilled_at` se conserva: se confirmó y después se soltó.
- Quien donó no suelta una ya confirmada: sólo el equipo (`admin`+), igual que el sí.
- Cancelada no tiene salida.
- `expired` queda para filas viejas. Ninguna función nueva escribe ese estado. `expire` sigue en el dominio como evento histórico; la interfaz no lo ofrece.

## Plazo y correo

`expires_at` sigue siendo `now() + 14 days` al reservar. Deja de ser el momento en que la base suelta el ítem: es el momento en que se avisa al equipo.

El mismo cron de `scripts/remind-pledges.mjs` (el que ya manda `pledge.reminder` a quien reservó) manda `staff.pledge_expired` cuando:

- `status = reserved`
- `expires_at <= now()`
- no hay `email_deliveries` `sent` de `staff.pledge_expired` para esa reserva

Incluye las reservas por teléfono (`user_id` nulo). La deduplicación permanente es `email_deliveries`, como el resto de los avisos al equipo. La clave de Resend no alcanza: vence a las 24 horas.

Copy de `staffPledgeExpired` (los dos JSON, idénticos, en castellano):

- Ya no dice que el ítem volvió ni que no hace falta hacer nada.
- Dice que pasaron 14 días, sigue reservado, hay que confirmar llegada o soltar.
- Acción: los dos destinos de ADR-051 (`/admin/donaciones/decidir/{id}/si` y `/no`). El GET no muta.

`pledge.reminder` (tres días antes, a quien reservó) no cambia.

Un fallo de correo no suelta la reserva (FR-233).

## Pantalla

`/admin/donaciones`

- En curso: «Sí: donan» y «Soltar la reserva», como hoy. Si `expires_at` ya pasó, la fila dice «Pasaron 14 días». Sigue en En curso.
- Cerradas, **Donado**: el mismo formulario de soltar (motivo obligatorio, «Soltar la reserva»).
- Cerradas, Cancelada: sólo Borrar, como hoy.

`/admin/donaciones/decidir/{id}/si` y `/no`

- Activa: confirma o suelta, como hoy.
- Ya Donado: el soltar con motivo, no sólo el texto «ya está confirmada».
- Ya Cancelada: el texto de hoy («ya no está activa»).

`/cuenta` no cambia: cancelar la propia sigue siendo sólo sobre `reserved`.

No hay primaria nueva. Borrar no se toca. No se manda otro correo a quien donó al soltar un sí (si ya le llegó el de recibido, no se desmanda). Al soltar, el equipo recibe `staff.pledge_cancelled` como hoy.

## Componentes y datos

- Dominio: `nextPledgeStatus` admite un extra: `fulfilled` + `cancel` → `cancelled`. Cualquier otro evento sobre fulfilled, y todos sobre cancelled, siguen lanzando. `isTerminalPledge` queda para cancelled (y `expired` viejo): la interfaz no usa ese helper para esconder el soltar de un Donado.
- Caso de uso: el `cancelPledge` de admin ya existe; la base es la que hoy rechaza fulfilled.
- Puerto: sin método nuevo.
- Migración: redefinir `cancel_donation_pledge`; sacar `perform release_expired_holds` de `claim_donation_item` y de `offer_donation_item`; desagendar `release-expired-donation-holds`.
- Métricas: «Reservas vencidas» deja de contar `status = expired` como «el material volvió solo». Las `reserved` con `expires_at` pasado se leen en «Reservas por vencer» (ya las nombra) y en Donaciones.

Sin tabla nueva. Sin columna nueva.

## Errores

- Soltar sin motivo: inválido, no toca la base (igual que hoy).
- Soltar una cancelada: `no_encontrada`.
- Soltar una donada siendo donante: `sin_permiso`.
- El ítem vuelve a ofrecerse en el catálogo; no se inventa disponibilidad de más.

## Tests

- Dominio: `fulfilled` + `cancel` → `cancelled`. Cancelada no admite cancel. Quien donó no cancela una confirmada.
- Postgres: admin suelta una donada; baja `fulfilled_quantity`; el ítem vuelve a faltar; el total de plata no se mueve. Un donante no puede. `claim_donation_item` con una reserva cuyo `expires_at` ya pasó **no** la marca vencida ni libera unidades.
- Cron / script: a los 14 días manda un `staff.pledge_expired`; el segundo pase no manda otro. El cuerpo no dice que el ítem volvió.
- Pantalla: en Cerradas, Donado tiene «Soltar la reserva»; Cancelada no. En curso con plazo pasado sigue activa y muestra «Pasaron 14 días».
- Muro: si tenía nombre, al soltar deja de aparecer.

## Documentación en el mismo trabajo

- Enmendar FR-217 / FR-218: el plazo avisa; no suelta. FR-221: el equipo puede soltar un sí. FR-260 no cambia el sí; el no y el deshacer el sí son `cancel`.
- `data-model.md`: `cancel_donation_pledge` acepta fulfilled; `release_expired_holds` no se invoca.
- Contrato de correos y ADR-033: `staff.pledge_expired` pide decisión, no informa un hecho automático.
- Diagrama en `pledge-status.ts`.

## Fuera de alcance

- Rediseñar la ficha, el inventario o el muro.
- Quitar la cancelación propia en `/cuenta`.
- Un segundo correo a quien donó al deshacer el sí.
- Borrar filas `expired` viejas.
- Hacer configurable la cantidad de días.
