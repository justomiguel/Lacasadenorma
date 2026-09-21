# Editar una reserva anotada

**Fecha:** 2026-09-20  
**Páginas:** `/cuenta` (Mis donaciones) y `/admin/donaciones`  
**No toca:** la ficha pública, el listado del catálogo, el muro, Quiénes ayudaron, aceptar, cumplir, soltar, ni un correo nuevo.

## Problema

Una reserva nace con la cantidad que se anotó y después no se cambia. Quien reservó 1 y quiere traer 3 más o bien cancela y anota de nuevo (pierde el plazo y el rastro) o bien crea otra reserva del mismo ítem (cuenta para el tope de 5). Tampoco puede dejar una nota. El equipo no puede corregir nombre o teléfono de una reserva por teléfono sin soltarla.

## Decisión

Una operación nueva, `update_donation_pledge`, mismo patrón que cancelar: un RPC, adentro decide si quien llama es dueño o admin.

1. **Solo `reserved`.** Aceptada, donada o cancelada no se editan. El plazo no se renueva.
2. **Quien reservó** cambia cantidad y nota de la suya. Nombre y teléfono, si los manda, se ignoran.
3. **El equipo** (`admin`+) cambia cantidad, nota, y —si nació por teléfono (`user_id` nulo)— nombre y teléfono.
4. **Cantidad > 0.** Cero es cancelar. Subir no puede pasar lo que falta más lo que ya tiene esta reserva. Bajar no puede ir a cero.
5. **Sin otro aviso.** No se manda `staff.new_pledge`. El equipo ve el cambio en el admin. Queda rastro `pledge.updated`.

Sin tabla nueva. Sin columna nueva. Anotar de nuevo en la ficha sigue creando otra reserva.

## Función

`update_donation_pledge(pledge_id, quantity, note, contact_name, contact_phone)`, `security definer`, `search_path = ''`, `grant execute to authenticated`.

- Sin sesión → `sin_sesion`.
- No es suya y no es admin → `sin_permiso`.
- No está `reserved` → `no_encontrada`.
- Cantidad nula, ≤ 0 o no entera → `cantidad_invalida`.
- El `update` condicional del ítem:

  ```
  reserved_quantity = reserved_quantity + (nueva − actual)
  where reserved + fulfilled + (nueva − actual) <= needed
  ```

  Si no toca fila → `sin_disponibilidad`.
- Admin vacía nombre o teléfono de una por teléfono → `datos_de_retiro`.
- Nota vacía borra la que había. Cambiar solo la nota manda la cantidad actual; el delta 0 no mueve el ítem. En una de cuenta, contacto no se escribe.

FR-220 se enmienda: quien reservó MAY editar cantidad y nota de una `reserved` propia, además de cancelarla. FR-216 no cambia el alta.

## Pantallas

`/cuenta` · Mis donaciones, solo `reserved`: cantidad (valor actual, techo = lo suyo + lo que falta) y nota optativa, junto a cancelar. Aceptada o donada: se ven, no se editan.

`/admin/donaciones` · En curso, solo `reserved`: **Editar esta reserva**. Cantidad, nota, y nombre/teléfono si es por teléfono. Aceptada, donada o cancelada: no hay editar.

Misma familia de acciones. Sin primaria nueva en la ficha.

## Errores

| Código | Qué ve |
|---|---|
| `sin_sesion` | A ingresar |
| `sin_permiso` | No se le ofrece el control |
| `no_encontrada` | Se recarga; ya no se edita |
| `cantidad_invalida` | Error en el campo |
| `sin_disponibilidad` | «Alguien se adelantó», catálogo al lado |
| `datos_de_retiro` | Error en nombre o teléfono |

## Tests

- Dominio: se edita `reserved`; accepted / fulfilled / cancelled no.
- Postgres: dueño sube y baja; `reserved_quantity` cierra; no sobrevende; no llega a 0; dueño cambia nota y no el teléfono; admin corrige contacto de una por teléfono; accepted no se toca; dos ediciones por la última unidad, una pierde.
- Aplicación: Zod + puerto + rastro `pledge.updated`.
- Pantalla: reserved tiene el formulario; accepted no. Admin: reserved tiene Editar; por teléfono salen nombre y teléfono.
- E2e: reservar 1, subir a 2 en la cuenta, ver el número nuevo.

## Fuera de alcance

- Editar en la ficha pública.
- Renovar el plazo al editar.
- Un segundo correo al equipo o a quien donó.
- Cambiar el canal (traer / plata) o el anonimato por reserva (sigue siendo de la cuenta).
- Unificar dos reservas del mismo ítem.
