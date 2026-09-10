# ADR-019 · El registro de auditoría se escribe por una función, no por privilegio de tabla

**Estado**: Aceptada · **Fecha**: 2026-09-10

## Contexto

Tres reglas del sistema, cada una correcta por separado, no pueden cumplirse a la vez si la entrada
de auditoría se inserta con la sesión de quien actúa.

    10|**1. El auditor no escribe una sola fila en ninguna tabla.** Es el rol que permite que alguien
externo a la familia verifique sin poder alterar nada (amenaza E2). La prueba pgTAP de la matriz de
permisos lo afirma tabla por tabla, y es una de las propiedades más fuertes del esquema: se cumple
por construcción, porque `auditor` es rango 1 y toda policy de escritura pide `editor` o más.

**2. Mirar un comprobante se registra.** Una factura trae el nombre y el domicilio de un proveedor, y
quién la abrió es parte de la rendición de cuentas (amenaza I1). El rol que más comprobantes va a
abrir es justamente `auditor`.

**3. Publicar una novedad se registra, y publicar novedades es lo que hace un `editor`.** La matriz
de `data-model.md` §4 le da a `editor` exactamente cero acceso a `audit_log`: no toca plata, así que
    20|no tiene nada que hacer en el libro.

La policy era `audit_log_insert ... with check (private.has_min_role('admin'))`, coherente con la
matriz. El resultado, en la práctica:

- **Un editor no podía publicar una novedad.** `perform` corre la mutación y después escribe la
  entrada de auditoría. La fila quedaba publicada en la base, la entrada no se escribía, y la
  pantalla decía "No se pudo cambiar el estado de la novedad". Un cambio sin rastro, con el mensaje
  equivocado y con la base y la interfaz diciendo cosas distintas. Es la falla exacta que el
  principio XII existe para que no ocurra.
- **Un auditor no podía abrir un comprobante**, por la misma razón y en el control que existe
    30|  precisamente para vigilar ese acceso.

Nada lo detectaba: las pruebas pgTAP verificaban que la policy fuera la que decía la matriz —y lo
era—, y las pruebas de la capa de aplicación usan un puerto en memoria que acepta cualquier entrada.
El defecto vivía en la costura entre las dos, y apareció en el primer recorrido del flujo crítico 9
con una sesión real.

## Decisión

**Nadie inserta en `audit_log` por privilegio de tabla. Se escribe llamando a
`public.record_audit(...)`, una función `security definer` que exige un rol interno y estampa el
    40|actor desde el token.**

```sql
create function public.record_audit(
  p_action text, p_entity_table text, p_entity_id uuid, p_diff jsonb
) returns void
language plpgsql
security definer
set search_path = ''
```

    50|- `revoke insert on public.audit_log from authenticated`: se quita el privilegio, no se amplía.
  Después de esto **ningún rol de la aplicación puede insertar una fila directamente**, ni `owner`.
- `grant execute ... to authenticated`, y adentro `private.has_min_role('auditor')`: la función es
  para los cuatro roles internos y para ninguno más. `anon` no tiene ni el `execute`, así que la
  llamada falla en el privilegio antes de llegar a la comprobación de rol.
- El actor y la fecha los sigue fijando el trigger `audit_log_stamp_entry` desde `auth.uid()` y el
  reloj del servidor (migración 20260909120800). La función no los recibe y no los podría falsificar.
- Sigue sin haber policy de `UPDATE` ni de `DELETE` para nadie. La tabla es append-only y ahora
  además tiene una sola vía de escritura.

    60|La matriz de `data-model.md` §4 se corrige: la fila de `audit_log` dice qué rol **lee** y aclara que
el agregado no es un privilegio de tabla de ningún rol. La prueba de la matriz pasa a esperar "sin
privilegio" en la inserción para los cuatro roles, que es más estricto que lo que esperaba antes.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Bajar la policy a `has_min_role('auditor')` | Le da al auditor privilegio de escritura sobre una tabla. Rompe la propiedad E2 —"no escribe una sola fila"— que hoy se cumple por construcción, y la cambia por una que hay que verificar leyendo una policy. Además le abre a `editor` una tabla que la matriz le niega |
| Quitarle la auditoría a las dos operaciones que fallan | Es tapar el síntoma con el control. Registrar quién abrió un comprobante es el control de la amenaza I1; borrarlo para que la operación no falle deja el acceso al dato privado de un tercero sin rastro |
| Escribir la auditoría con la clave de servicio desde el servidor | Pone una credencial que saltea RLS entera en el camino de toda mutación del backoffice, para escribir una fila. `SUPABASE_SECRET_KEY` no se usa en ningún lugar del código de la aplicación, y `docs/security.md` §7 lo verifica buscándola dentro de los artefactos construidos |
    70|| Un trigger `after` en cada tabla auditable, que escriba la entrada solo | Resuelve el privilegio y pierde el motivo: el `diff` que se guarda lo arma cada caso de uso ya redactado, sin datos sensibles, y un trigger sólo ve columnas. De una cuenta bancaria guardaríamos el CBU nuevo en lugar de "cambiaron estos campos" |
| Hacer la mutación y la auditoría en una sola función SQL por operación | Resolvería además la atomicidad, que es un problema real y queda abierto. Son once operaciones, cada una con su validación ya escrita en Zod y sus mensajes en castellano; moverlas a plpgsql duplicaría la validación en un lenguaje sin tipos compartidos con el resto. No vale el cambio hoy |

## Consecuencias

**Buenas.**

- La superficie de escritura de la tabla más delicada del esquema pasa de "cuatro roles con `insert` y
  una policy" a "una función". Es menos, no más.
- Las dos operaciones que estaban rotas funcionan, y las dos son controles de seguridad: el rastro de
    80|  quién publicó y el rastro de quién abrió un comprobante.
- Un `editor` puede agregar al registro y **no puede leerlo**: la policy de `select` sigue pidiendo
  `can_read_ledger()`. Escritura sin lectura es la forma correcta para un rol que no toca plata.
- La regla "quién puede dejar rastro" queda en un solo lugar ejecutable, en lugar de repartida entre
  una policy de tabla y la tabla de permisos del dominio.

**Malas y aceptadas.**

- Una función `security definer` más. Está acotada: devuelve `void`, no acepta un actor, no lee nada,
  tiene `search_path` fijado y comprueba el rol antes de escribir.
- Un rol interno puede escribir una entrada con un `action` y un `entity_table` que no correspondan a
    90|  ninguna operación real. La fila queda atribuida a esa persona y no se puede borrar, así que el
  incentivo es nulo; y ya podía hacerlo `admin` antes.
- **La mutación y su entrada de auditoría siguen sin ser atómicas.** Son dos viajes a PostgREST: si
  el segundo falla por red, la operación queda hecha, sin rastro, y reportada como fallida. Después
  de este cambio ya no puede fallar por permisos, que era la única causa que se disparaba siempre;
  lo que queda es una falla de red, y ante ella la interfaz dice que no pudo y el detalle queda en el
  log del servidor. Cerrarlo del todo pide mover cada operación a una función SQL, que está en la
  tabla de alternativas descartadas con su motivo. Queda anotado como deuda conocida en
  `docs/security.md`.
