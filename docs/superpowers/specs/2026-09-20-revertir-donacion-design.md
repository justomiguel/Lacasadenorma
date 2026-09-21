# Revertir una donación desde Cerradas

**Fecha:** 2026-09-20  
**Página:** `/admin/donaciones`  
**No toca:** aportes ni gastos de plata, el camino de cancelar una reserva en curso, ni el HTML público según sesión.

## Problema

En Cerradas, una fila **Donado** se puede borrar (se va la fila) o soltar (motivo obligatorio, aviso al equipo). Quien opera quiere deshacer la confirmación como si esa donación no hubiera ocurrido: las unidades vuelven al catálogo, el nombre sale del muro, la reserva queda cancelada, y quien donó se entera.

## Decisión

Una operación nueva, `revert_donation_pledge`, distinta de borrar y de cancelar una reserva activa.

- Sólo sobre **Donado**. Cancelada y Vencida no la muestran.
- Pasa a **Cancelada** y se queda en Cerradas.
- Baja `fulfilled_quantity`. No deja las unidades reservadas.
- Limpia `fulfilled_at`: el muro recorta por esa fecha, y el `CHECK` exige nulo si el estado no es `fulfilled`.
- Motivo optativo. Si falta, se guarda «Revertida desde Cerradas».
- Correo `pledge.reverted` a quien donó. Sin cuenta o sin correo, la reversión igual se completa.
- Auditoría `pledge.reverted`. El correo de «llegó» no se borra.
- `donaciones.escribir` (`admin` y `owner`). El editor no ve el botón.
- Borrar no cambia.

En curso sigue con «Sí: donan» y soltar con motivo obligatorio. El enlace de decidir del correo también.

## Pantalla

En Cerradas, Donado: **Revertir** al lado de **Borrar**.

- Una línea: las unidades vuelven al catálogo, sale del muro si figuraba, queda cancelada acá.
- Motivo no obligatorio, 300 caracteres.
- Envío: **Revertir la donación**. No es danger.

`/cuenta` no lista canceladas: la fila desaparece. El aviso es el correo.

## Correo

Asunto: «Esa confirmación se deshizo». El enlace va al catálogo, no a la cuenta. Castellano e inglés. `{what}` es lo único que se sustituye.

## Datos

`revert_donation_pledge(id, motivo?)`, `security definer`, `search_path = ''`, sólo `admin`+. Si no está `fulfilled`, `no_encontrada`. `cancel_donation_pledge` sobre un Donado también limpia `fulfilled_at` (el `CHECK` y el muro lo exigen).

FR-222 se enmienda: admin/owner MAY revertir una entrega confirmada. Sigue sin tocar plata.
