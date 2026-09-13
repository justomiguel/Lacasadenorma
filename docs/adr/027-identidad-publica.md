# ADR-027 · Una identidad, dos audiencias: `authenticated` deja de significar «de confianza»

**Estado**: Aceptada · **Fecha**: 2026-09-13

## Contexto

Todo el modelo de acceso de la base se escribió para un sistema donde tener sesión implicaba ser una
de entre dos y cinco personas de la familia (ADR-003, ADR-004). Eso se ve en la forma de las
policies: hay una para `anon` que comprueba `published_at`, y otra para `authenticated` que además
admite a los roles internos. Y se ve en los privilegios: `grant select, insert, update, delete … to
authenticated` sobre casi todas las tablas.

El catálogo de donaciones necesita que cualquiera pueda crear una cuenta. Desde el segundo en que
`enable_signup` pase a `true`, **`authenticated` significa "cualquiera con un correo"**, y esos
`grant` pasan a estar otorgados a internet entero.

Conviene ser preciso sobre qué se rompe y qué no, porque la respuesta no es "todo":

- Las policies **aguantan**. `private.has_min_role()` devuelve `false` para una cuenta sin fila en
  `user_roles`, porque el hook no le pone el claim `user_role` al token, y `private.role_rank(null)`
  da 0. Una cuenta del público no pasa ningún `with check`.
- Lo que se pierde es la **segunda barrera**. El propio archivo de policies dice que
  `contributions`, `expense_receipts`, `user_roles` y `audit_log` quedan fuera del `grant` a `anon`
  "por si alguna vez alguien agregara una policy de lectura por error". Ese razonamiento valía porque
  del otro lado del `grant` a `authenticated` había cinco personas conocidas. Ya no.

O sea: hoy la única cosa entre una cuenta recién registrada y la tabla de aportes es que ninguna
policy la deje pasar. Eso es correcto y es una sola capa, y es exactamente la clase de propiedad que
se cumple hasta el día en que alguien agrega una policy `to authenticated` sin predicado.

## Decisión

**Un solo proveedor de identidad, dos audiencias, y la frontera entre ellas definida por la ausencia
de rol interno.** Una cuenta es del público si y sólo si no tiene fila en `public.user_roles`. No hay
tabla de "usuarios públicos" ni bandera que lo declare: una bandera podría discrepar con los roles,
y la ausencia no puede.

Y como la premisa que se cae es una premisa que sólo vivía en la cabeza de quien escribió las
policies, se le pone una compuerta: **`scripts/check-rls.mjs`, en `npm run verify` y en
`.github/workflows/db.yml`**. Falla el build si en `supabase/migrations/**`:

1. una policy `to authenticated` (o sin `to`, que es lo mismo más callado) no nombra
   `private.has_min_role`, `private.can_read_ledger`, `private.can_read_donors` **ni** un predicado
   de propiedad sobre `auth.uid()`;
2. una policy usa `for all`, que mezcla la condición de lectura con la de escritura;
3. una función `security definer` no fija `set search_path = ''`;
4. una vista sobre una tabla con datos personales no declara `security_invoker = true`.

Las cuatro son reglas que ya estaban escritas en prosa en `data-model.md` y en los comentarios de las
migraciones. La diferencia es que ahora una violación no compila.

La segunda mitad de la compuerta es la matriz: `supabase/tests/030-matriz-de-permisos.sql` gana una
**persona más, `donante`** —usuario autenticado sin fila en `user_roles`— y se la prueba contra toda
tabla y toda operación, igual que a los cuatro roles internos. La matriz ya existe y ya cubre 894
líneas de combinaciones; agregar la sexta persona es sumarle una columna a algo que ya funciona.

### Lo que la matriz dijo cuando se corrió

La propiedad que queda verificada **no es** "una cuenta del público no ve nada". Es más precisa y hay
que escribirla bien, porque es la que se va a citar como garantía:

> Sobre todo lo de la feature 001, una cuenta del público ve **exactamente lo mismo** que alguien sin
> cuenta, y no escribe nada.

Las policies internas están escritas como `published_at is not null or private.has_min_role('auditor')`,
así que a una cuenta nueva le dan lo publicado —que ya es público— y nada más. La aserción compara la
columna de `donante` contra la de `anon` **fila por fila** en lugar de repetir a mano una lista que
puede envejecer: el día que alguien escriba una policy que le dé a `authenticated` algo que `anon` no
tiene, aparece ahí sin que nadie se haya acordado de agregar una prueba.

Y una lección sobre las compuertas en general. La aserción que verifica que `auth.*()` esté envuelta
en un subselect existía desde la feature 001 y **nunca se había ejercido**, porque hasta
`donor_profiles` ninguna policy del proyecto llamaba a `auth.*()` directamente: todas pasaban por
`private.has_min_role()`. Su patrón estaba incompleto —`pg_policies` devuelve el árbol deparseado y
Postgres le agrega la etiqueta de la columna, `( SELECT auth.uid() AS uid)`— así que las cuatro
policies nuevas, escritas de la forma correcta, aparecían como violaciones. Una compuerta que nunca
vio un caso legítimo no está verificada: está esperando.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Un segundo proyecto de Supabase para el público | Dos sistemas de identidad, dos claves en el entorno, y el muro de donaciones tendría que unir datos de dos bases. Además, la misma persona podría ser donante y editora, y serían dos cuentas sin relación |
| Un esquema `public_app` aparte con sus propios `grant` | Suena bien hasta que se nota que `authenticated` es un rol de Postgres, uno solo: el equipo y el público comparten rol de base. Separar esquemas no separa quién puede qué |
| Sign-ins anónimos de Supabase para reservar sin registro | Un usuario anónimo también es `authenticated`, así que debilita la misma frontera, y no tiene correo: no se le puede avisar que su reserva vence, que es la mitad del diseño |
| Una columna `is_staff` en un perfil | Puede discrepar con `user_roles`. Dos fuentes de verdad sobre quién es del equipo es la clase de bug que se descubre tarde |
| Revisar las policies a ojo y seguir | Es exactamente lo que la constitución prohíbe desde el 12 de septiembre: una regla que sólo vive en un documento no frena nada |
| Quitarle los `grant` de escritura a `authenticated` y escribir todo por funciones `security definer` | Es más seguro y es una reescritura de las quince operaciones del backoffice, que hoy funcionan y están probadas. Se deja anotado como el paso siguiente si aparece una segunda razón para darlo |

## Consecuencias

**Buenas.** La frontera queda definida por una condición que no se puede falsificar desde el cliente:
o hay fila en `user_roles`, o no la hay, y quien la escribe es `owner`. La compuerta convierte en
error de build la clase de descuido que de otro modo se descubre leyendo policies viejas con calma
que nadie tiene. Y la matriz de pgTAP pasa a describir el sistema real: seis personas, no cuatro.

**Malas y aceptadas.**

- **El público y el equipo comparten el rol `authenticated` de Postgres.** Los `grant` de escritura
  siguen otorgados a los dos, y lo único que separa a una cuenta nueva de la tabla de aportes es que
  ninguna policy la admita. La compuerta verifica que eso siga siendo cierto en cada commit, pero la
  arquitectura sigue siendo de una sola capa en ese punto. Está declarado como riesgo en el modelo de
  amenazas con su mitigación y su disparador de revisión.
- `enable_signup = true` habilita el registro **para todo el proyecto**, incluido el endpoint de
  Auth. No hay forma de abrirlo "sólo para donantes". La consecuencia concreta es que el tope de
  cuentas basura lo pone la confirmación de correo y el límite de tasa, no una lista de invitación.
- Una cuenta del público que intente entrar al backoffice pasa el proxy —porque el proxy sólo mira si
  hay sesión— y la negativa llega recién en la página. Es el diseño que ADR-003 ya eligió (el proxy
  no es una frontera), y ahora se prueba con la persona `donante` en la suite de Playwright, porque
  el caso pasó de teórico a cotidiano.
- El rol interno de una persona sigue viajando en el token y sigue siendo tan fresco como el último
  refresh. Sin cambios respecto de ADR-004, pero ahora importa en la otra dirección: darle un rol a
  alguien que ya tenía cuenta del público no tiene efecto hasta que su token rote.
