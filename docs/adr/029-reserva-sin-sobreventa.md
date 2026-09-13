# ADR-029 · La reserva no se decide leyendo: se decide con un contador y un CHECK

**Estado**: Aceptada · **Fecha**: 2026-09-13

## Contexto

El pedido dice, textual, "evitar donar dos veces algo". Traducido: dos personas no pueden quedarse
con el mismo ejemplar del mismo ítem.

La forma natural de escribirlo es la incorrecta:

```ts
const faltan = necesarias - reservadas; // lee
if (cantidad <= faltan) {
  await insertarReserva(cantidad); // escribe
}
```

Entre la lectura y la escritura hay una ventana, y con dos personas mirando el catálogo al mismo
tiempo —que es justo lo que pasa cuando la campaña circula por WhatsApp— las dos leen "falta uno" y
las dos insertan. El sistema queda sobrevendido y nadie se enteró. Es un *time-of-check to
time-of-use* clásico, y no se arregla comprobando mejor: se arregla no comprobando.

Hay un segundo problema, del que depende el primero: una reserva que nadie entrega bloquea el ítem
para siempre. Hace falta que venza. Y si el vencimiento lo ejecuta un proceso programado, entonces la
corrección del catálogo depende de que ese proceso esté vivo, que es una dependencia silenciosa: el
día que el programador se caiga, el catálogo va a mentir sin dar ninguna señal.

## Decisión

**Lo reservado es una columna, y el límite es una restricción de la base.**

`public.donation_items` lleva `reserved_quantity` y `fulfilled_quantity`, y:

```sql
constraint donation_items_not_oversubscribed
  check (reserved_quantity >= 0
     and fulfilled_quantity >= 0
     and reserved_quantity + fulfilled_quantity <= needed_quantity)
```

Con esa restricción, **la sobreventa no es un estado alcanzable**. No hay código de aplicación que
pueda producirla, ni una migración futura, ni un `update` a mano en una consola a las tres de la
mañana.

Las dos columnas las mueve una sola función, `public.claim_donation_item(...)`, `security definer`,
que en una transacción:

1. libera lo vencido **de ese ítem** (ver abajo);
2. hace `update … set reserved_quantity = reserved_quantity + p_quantity where id = p_item_id and
   reserved_quantity + fulfilled_quantity + p_quantity <= needed_quantity`;
3. si no actualizó ninguna fila, levanta un error de dominio: alguien se adelantó;
4. inserta la reserva.

El paso 2 es el que resuelve la concurrencia, y lo resuelve porque **un `update` toma el lock de la
fila**: la segunda transacción espera, y cuando entra vuelve a evaluar el `where` sobre el valor ya
actualizado. No hay ventana. El `check` del párrafo anterior es el cinturón además del tirante: si
alguna vez se escribe otro camino que mueva el contador, falla ahí.

`authenticated` **no tiene `insert` sobre `donation_pledges`**. La única forma de crear una reserva es
la función, igual que la única forma de escribir en `audit_log` es `record_audit()` (ADR-019).

**El vencimiento es auto-sanante.** `claim_donation_item` empieza liberando las reservas vencidas del
ítem que está por tocar, en la misma transacción. `pg_cron` corre `release_expired_holds()` una vez
por hora para que el catálogo se vea bien sin que nadie lo toque, pero **la corrección no depende del
cron**: lo peor que produce un cron caído es un ítem que se muestra como no disponible hasta que
alguien intenta reservarlo, y ahí se libera y se lo lleva. Se muestra menos disponibilidad de la que
hay, nunca más.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Leer y después insertar, con la comprobación en la aplicación | Es el bug que esta decisión existe para no tener. Dos pestañas abiertas lo reproducen |
| Calcular lo disponible con un `sum()` de reservas en cada lectura | No se puede poner un `check` sobre un agregado de otra tabla. Sin restricción, la corrección vuelve a depender del código que escriba la próxima persona |
| `select … for update` y después decidir | Funciona, y es dos sentencias donde alcanza una. El `update` condicional ya toma el lock que este patrón toma a mano |
| Nivel de aislamiento `serializable` | Habría que pedirlo por request a través de PostgREST, y traslada el problema a manejar fallos de serialización y reintentos en cada llamada. Mucha maquinaria para un contador |
| Un lock de asesoría (`pg_advisory_xact_lock`) | Correcto e invisible: la garantía no estaría en el esquema, así que no se ve leyendo las tablas ni se puede probar sin reproducir la concurrencia |
| Un índice único sobre (ítem, número de ejemplar) | Obligaría a modelar cada unidad como fila. Para "hacen falta 40 chapas" son 40 filas sin ninguna identidad propia |
| Confiar el vencimiento sólo a `pg_cron` | Es la dependencia silenciosa que el principio XII prohíbe: si no corre, el catálogo miente y no avisa |

## Consecuencias

**Buenas.** La propiedad que el pedido nombra —que no se done dos veces lo mismo— queda garantizada
por el esquema y no por la disciplina de quien escriba el próximo caso de uso. Se prueba con dos
sesiones concurrentes en pgTAP, y se prueba también intentando el `update` prohibido directo contra
la tabla, que es la prueba que importa: la que ataca el sistema en lugar de usarlo.

**Malas y aceptadas.**

- **Lo reservado está en dos lados**: el contador del ítem y la suma de sus reservas activas. Son
  redundantes y podrían discrepar si alguien mueve uno sin el otro. Se mitiga con que sólo tres
  funciones los mueven, y con una prueba pgTAP que verifica que el contador es igual a la suma de las
  reservas activas después de una secuencia de reservar, cancelar, vencer y entregar.
- Bajar `needed_quantity` por debajo de lo comprometido **falla con un error de restricción** de
  Postgres, no con una frase amable. La capa de aplicación tiene que traducirlo a "hay tres unidades
  comprometidas" (FR-221, US4 escenario 5); si no lo traduce, el formulario del backoffice muestra un
  mensaje del motor. Está como tarea explícita y como test.
- Dos personas reservando el mismo ítem al mismo tiempo **se serializan**: la segunda espera el lock
  de la fila. Con un ítem popular y una fila caliente eso es contención en un solo renglón. Para el
  volumen de este sitio es irrelevante, y conviene tenerlo escrito para no redescubrirlo si alguna vez
  deja de serlo.
- `pg_cron` es una extensión más para habilitar en producción, con su paso en el runbook, y **no
  existe en el Postgres local** de `scripts/db-local.sh` (ADR-013). La función que el cron invoca se
  prueba llamándola directo; lo que no se prueba localmente es el agendamiento.
