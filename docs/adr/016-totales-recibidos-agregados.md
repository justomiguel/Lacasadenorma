# ADR-016 · El total recibido viene de una vista agregada, no del detalle de aportes

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

El modelo de datos tiene dos reglas que, tomadas juntas, se contradicen si no se resuelve una tensión
que en el papel no se veía.

La primera: **`anon` no puede leer `contributions`**. Un aporte individual —monto, fecha, y a veces
    10|una nota de conciliación— puede identificar a una persona en un pueblo donde todos se conocen. Es la
amenaza I2 y el requisito FR-014, y la tabla no tiene ni policy ni privilegio de `select` para el rol
anónimo.

La segunda: **el sitio público publica el total recibido**. Es la mitad de la rendición de cuentas y
la cifra que aparece en la home.

Los repositorios de la primera versión leían `contributions` y sumaban en el dominio. Contra la base
local con PostgREST, la lectura pública falla con `permission denied for table contributions`, que es
exactamente lo que la policy tiene que hacer. La contradicción existía desde el diseño; la emulación
local sólo la hizo visible antes del primer despliegue.
    20|
Este ADR existe porque la salida elegida cambia una firma del dominio, y eso es una decisión de
arquitectura que no puede quedar sólo en un commit.

## Decisión

**El total recibido por moneda se lee de `public.campaign_totals`. Todo lo demás se calcula sumando
el detalle público.**

La vista se apoya en `private.campaign_totals_for`, una función `security definer` con `search_path`
fijado que devuelve **únicamente el agregado**: nunca una fila de aporte. El privilegio elevado está
    30|acotado a la operación más chica que resuelve el problema, que es la forma correcta de usarlo.

En consecuencia:

- `TransparencyRepository` deja de tener `listContributions` y gana `listReceivedTotals`, que
  devuelve un `Money` por moneda.
- `summarizeTransparency` y `summarizeFundraising` reciben `received: readonly Money[]` en lugar de
  `contributions`. El dominio ya no supone que el total recibido se pueda derivar de un detalle: es
  un dato de entrada, igual que el objetivo.
- El gasto, el saldo, el porcentaje ejecutado, el conteo de gastos, el conteo de comprobantes y el
  desglose por categoría se siguen calculando **sumando el detalle público de gastos**. SC-007 —que
    40|  la suma del detalle publicado sea exactamente el total publicado— queda garantizado por
  construcción para lo único que tiene detalle publicado.
- El saldo es `recibido (vista) − gastado (detalle)`. Las dos partes vienen de la misma transacción
  de lectura y de las mismas filas que la vista habría sumado, con los mismos filtros
  (`voided_at is null`, `published_at is not null`), así que no pueden divergir sin que un test lo
  note.

## Alternativas descartadas

| Alternativa | Por qué no |
    50||---|---|
| Dar `select` sobre `contributions` a `anon` y filtrar columnas en la consulta | La columna se filtra en el cliente, no en la base. Un `select` mal escrito, un embed de PostgREST o una consulta directa a la API con otras columnas expone lo que la policy tenía que proteger. La frontera no puede estar en el código de la aplicación (principio V) |
| Una vista `contributions_publicas` con las columnas seguras | Sigue publicando el detalle: montos y fechas individuales. En un pueblo chico, "$ 500.000 el 3 de septiembre" alcanza para saber quién fue |
| Sumar los aportes en el servidor con la clave de servicio | Pone una credencial con permisos totales en el camino de una página pública cacheada. Es la peor forma de resolver un problema de lectura |
| Guardar el total recibido en una columna de `campaigns`, mantenida por trigger | Es un dato derivado que se puede desincronizar, y el saldo dejaría de ser verificable contra el detalle. Ya se usa un contador derivado para los comprobantes, donde el dato es un entero chico y el trigger es la única vía de escritura; un total de dinero tiene demasiadas vías |
| Dos funciones de agregación en el dominio, una para el público y otra para el backoffice | Dos caminos que calculan la misma cifra terminan divergiendo, y el que divergiría es el que casi nadie mira. Es el mismo argumento por el que las capacidades de agentes llaman los casos de uso de las páginas (amenaza A5) |

## Consecuencias
    60|
**Buenas.**

- El detalle de aportes no tiene camino de lectura pública en ningún nivel: no hay policy, no hay
  privilegio, y ahora tampoco hay código que lo intente. Las tres barreras son independientes.
- El dominio queda más honesto: `summarizeTransparency` ya no finge poder derivar el total recibido, y
  su firma dice de dónde viene cada cifra.
- La cifra pública se calcula en la base, en una sola consulta, sobre las mismas filas que audita el
  backoffice.

    70|**Malas y aceptadas.**

- Hay una función `security definer` más en el sistema, y cada una es una excepción al mínimo
  privilegio que hay que poder justificar. Ésta devuelve un agregado, no acepta parámetros del
  usuario más que un `uuid`, y tiene `search_path` fijado.
- El backoffice va a necesitar su propio puerto para el detalle de aportes, con su propia
  autorización. Es lo correcto: son dos lecturas distintas, con dos permisos distintos, y ahora se
  ven distintas también en el código.
- Un test del dominio ya no puede construir el escenario "hubo tres aportes y uno se anuló" pasando
  tres registros: pasa el total que la vista habría devuelto. La regla de exclusión de anulados se
  sigue probando donde ahora vive, que es la función SQL, con pgTAP.
