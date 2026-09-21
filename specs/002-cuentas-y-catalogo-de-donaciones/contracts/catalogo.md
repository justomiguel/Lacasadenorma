# Contrato — Catálogo, reservas y capacidad de agente

## Lectura pública

Dos vistas, las dos con `security_invoker = true`, las dos legibles por `anon` y por
`authenticated`. Están definidas en [data-model.md](../data-model.md) §3.

| Vista | Devuelve | No devuelve |
|---|---|---|
| `donation_catalog` | Ítems con `remaining_quantity` y el estimado de la ficha (ADR-041) | Borradores, nombres |
| `donation_catalog_claims` | Seis columnas de reservas y entregas con nombre, incluida `has_portrait` | Lo anónimo, correo, nota, `portrait_path`, `user_id` |
| `donation_wall` | Cinco columnas de las donaciones entregadas y no anónimas | Una reserva, aunque tenga nombre. El retrato |

El repositorio de infraestructura consulta **las vistas, nunca las tablas**, y con lista de columnas
explícita como el resto del proyecto.

## Escritura: estas funciones y ninguna otra puerta

`authenticated` no tiene `insert` sobre `donation_pledges`. Las firmas completas y sus comprobaciones
están en [data-model.md](../data-model.md) §5; acá está lo que la capa de aplicación tiene que
traducir.

| Función | Quién | Error | Qué ve la persona |
|---|---|---|---|
| `claim_donation_item` | Cuenta con sesión, no `declined` | `sin_sesion` | Se la manda a ingresar, y vuelve al mismo ítem |
| | | `sin_habilitacion` | La cuenta fue rechazada |
| | | `datos_de_retiro` | Ya no aplica a una reserva con cuenta. En el aviso por teléfono, falta el nombre |
| | | `sin_disponibilidad` | "Alguien se adelantó": estado **diseñado**, con el catálogo actualizado al lado |
| | | `demasiadas_reservas` | Cuántas tiene y cuáles puede cancelar |
| | | `cantidad_invalida` | Error asociado al campo |
| `cancel_donation_pledge` | Su dueña, o `admin`+ | `no_encontrada` | La reserva ya no está activa; se recarga la cuenta |
| `update_donation_pledge` | Su dueña, o `admin`+ | `sin_sesion` | Se la manda a ingresar |
| | | `sin_permiso` | No se le ofrece el control |
| | | `no_encontrada` | La reserva ya no está `reserved`; se recarga |
| | | `cantidad_invalida` | Error asociado al campo |
| | | `sin_disponibilidad` | "Alguien se adelantó": estado **diseñado**, con el catálogo actualizado al lado |
| | | `datos_de_retiro` | Error en nombre o teléfono (admin, reserva por teléfono) |
| `fulfill_donation_pledge` | `admin`+ | `sin_permiso` | No se le ofrece el control |
| `revert_donation_pledge` | `admin`+ | `no_encontrada` | La reserva ya no está Donado; se recarga Cerradas |

Y una traducción que no viene de una excepción nuestra sino del motor: bajar `needed_quantity` por
debajo de lo comprometido falla con `23514` y el nombre del `check`. La capa de aplicación **tiene que
convertir eso** en "hay tres unidades comprometidas; cancelalas primero" (US4 escenario 5). Si no lo
hace, el formulario del backoffice muestra un mensaje de Postgres, que es la definición de estado no
diseñado. Borrar un ítem con reservas o entregas las borra también (`on delete cascade`). El
rastro queda (US4 escenario 7, ADR-050).

## Reglas de la capa de aplicación

- **Toda entrada se valida con Zod del lado del servidor**, aunque la función de la base también
  valide. Un esquema de entrada es una pista para quien llama, no una frontera.
- `claim-item.ts` llama la función, **y después** intenta el correo. El correo nunca está dentro de la
  transacción (ADR-028).
- Toda operación sobre el catálogo o sobre una reserva pasa por `perform()` y escribe el rastro con
  `record_audit()` (ADR-020, FR-223). Acciones nuevas: `donation_item.created`,
  `donation_item.updated`, `donation_item.published`, `donation_item.deleted`, `pledge.claimed`,
  `pledge.updated`, `pledge.cancelled`, `pledge.fulfilled`, `pledge.reverted`.
- La revalidación es explícita al publicar o al cambiar disponibilidad (ADR-017): `/catalogo`,
  `/catalogo/[id]`, `/quienes-ayudaron` y sus equivalentes en `/en`. SC-212 —cinco minutos entre
  confirmar y ver el nombre— se cumple por el ISR de cinco minutos incluso si la invalidación
  explícita falla.

## Capacidad de agente

Se agrega una sola, de **sólo lectura**, al registro que ya existe (ADR-009), con adaptador REST en
`/api/public/[capability]` y herramienta WebMCP, como las cinco que ya están.

El nombre para una persona es «catálogo de donaciones». El identificador registrado es
`get_donation_catalog` (slug REST `donation-catalog`): el registro existente exige el prefijo
`get_` y los campos en inglés (ADR-014).

**`get_donation_catalog`** — qué le falta a la obra.

```json
{
  "items": [
    {
      "title": "Chapas del techo",
      "description": "Chapa sinusoidal calibre 25, de 3,66 m",
      "unit": "unidad",
      "needed": 40,
      "remaining": 35
      "estimated": null
    }
  ],
  "updatedAt": "2026-09-13T18:00:00.000Z"
}
```

Lo que **no** devuelve, y por qué:

| Ausencia | Motivo |
|---|---|
| Nombres del muro | FR-242 y FR-031 de la feature 001: ninguna capacidad devuelve datos personales. Que el dato sea público en una página no lo vuelve apto para una API que un agente puede recorrer entero |
| El valor estimado | La ficha lo publica etiquetado (ADR-041). Sin estimado cargado, se omite |
| Cualquier forma de reservar | Reservar compromete a una persona real frente a una familia. Ninguna herramienta de agente inicia ni facilita eso, por la misma razón por la que ninguna mueve plata |

Corre por el mismo `runCapability()` y por el mismo caso de uso que la página, así que no hay dos
caminos de código para la misma lectura.

## SEO

`/catalogo` y `/quienes-ayudaron` con metadata propia en los dos idiomas, `hreflang`, y entrada en el
sitemap. **Sin datos estructurados** de producto ni de oferta: el catálogo no vende nada, y declarar
`Offer` o `Product` sería afirmar una figura comercial que no existe, que es lo mismo que FR-028
prohíbe para la personería jurídica.
