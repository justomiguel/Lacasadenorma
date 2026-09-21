# Donantes que dan por fuera de la página

**Fecha:** 2026-09-20  
**Páginas:** `/admin/donantes` y `/admin/donantes/[id]`  
**No toca:** roles del equipo, el HTML público según sesión, Aportes como pantalla (sigue anotando plata sin elegir persona), ni un material suelto sin ítem del catálogo.

## Problema

Quien dona plata o trae material sin pasar por el sitio no tiene ficha. El aporte queda con un nombre suelto. El material, si entra, es un aviso por teléfono sin cuenta. No hay forma de ver todo lo que dio esa persona, ni de dejarle una cuenta lista por si después quiere verse o anotarse sola.

## Decisión

El owner (y el admin) crean una **cuenta del público** para esa persona.

- Nombre obligatorio. Correo y teléfono, si los hay.
- Sin correo, el sistema inventa `{local}@lacasadenorma.com` a partir del nombre. Ese mail es el login, no se publica.
- La cuenta nace **habilitada**. El correo se confirma cuando abren el invite, no al insertar. El pendiente de ADR-033 queda para quien se anota sola.
- Nace con un enlace de un solo uso (`invite` → `/cuenta/confirmar`). Si el owner escribió un mail, también se manda ahí. Si el mail es inventado, no se manda nada.
- La ficha junta plata y material. Se le puede cargar un aporte atado y un ítem del catálogo ya entregado.
- No es dar un rol interno. Es donante, no entra al backoffice.

## Pantalla

### Alta — `/admin/donantes`

Arriba de «Para revisar». Formulario corto, `donaciones.escribir`. Si no hay clave secreta de Auth, el formulario no se ofrece.

Campos, cada uno con marca antes del nombre (ADR-047):

- Nombre (obligatorio)
- Correo (optativo)
- Teléfono (optativo)

Envío: **Crear la cuenta**. Tras guardar, la misma pantalla muestra el mail (inventado o real), el enlace para copiar, y —si hay teléfono— WhatsApp con el logo de la marca y ese enlace en el mensaje.

Mail repetido: no crea otra. Dice que esa dirección ya está y ofrece ir a esa ficha.

### Ficha — `/admin/donantes/[id]`

`donaciones.leer` para verla. Escribir pide `donaciones.escribir`.

Arriba: nombre, mail, teléfono, enlace vigente y **Volver a generar** (el invite vence).

Abajo, dos bloques:

1. **Plata.** Lista de aportes atados. Formulario igual al de Aportes (monto, moneda, fecha, medio, nota interna, aparecer en el muro). Queda con `user_id` de esta persona.
2. **Material.** Lista de reservas/entregas suyas. Formulario: ítem del catálogo, cantidad, aparecer en el muro. Se registra **ya entregado**. No pasa por reservar ni por el sí.

La lista de habilitadas enlaza a esta ficha.

## Alta de la cuenta

1. Normalizar el mail: el que escribió el owner, o el inventado.
2. `auth.admin.createUser` **sin** confirmar el correo y una clave al azar que nadie ve.
3. `provision_donor_account(user_id, display_name, phone?)`: inserta el perfil **approved**, `reviewed_at`/`reviewed_by` = el actor, teléfono si vino. `security definer`, `search_path = ''`, sólo `admin`+. La persona no se habilita sola: el insert autenticado sigue exigiendo `pending`.
4. `generateLink({ type: "invite", email })`. El `token_hash` arma la URL de `/cuenta/confirmar`. Quien abre ese enlace confirma.
5. Si el owner escribió el mail, correo de identidad nuevo (`account.invite`): cómo entrar, el mismo enlace. Si se inventó, no se manda.
6. Auditoría `donor.provisioned`: actor, nombre, si el mail fue inventado. Ni clave ni token.

El perfil nace en castellano (`locale = es`). El anonimato por defecto no cambia: aparecer se tilda en cada carga, no al crear la cuenta.

**Mail inventado.** Se parte el nombre: minúsculas, sin tildes, espacios a punto, sólo `[a-z0-9.]`. Si no queda nada, `alguien`. Choque: `maria.perez-2@lacasadenorma.com`, después `-3`. El dominio es fijo: `lacasadenorma.com`. Se sabe que fue inventado porque el campo correo vino vacío, no porque el dominio coincida.

**Volver a generar.** Otro `generateLink` invite si el correo sigue sin confirmar. Si ya abrieron el primero, invite 422 (`email_exists`) y se pide `recovery`. El anterior sigue válido hasta que venza; el nuevo no lo apaga.

## Plata

`contributions.user_id` uuid nullable → `auth.users` `on delete set null`. Los aportes de antes quedan sin persona. Aportes no pide elegir una.

Atar un aporte no publica el monto. El nombre en el muro sigue pidiendo el tilde de aparecer y un `contributor_display_name`. En la ficha, ese nombre se precarga con el de la cuenta.

## Material

Nadie inserta `donation_pledges` directo. Función nueva, `record_donor_arrival(user_id, item_id, quantity, display_name?)`:

- Sólo `admin`+.
- Inserta la reserva **fulfilled**, `fulfilled_at = now()`, `accepted_at = now()`, `expires_at = now()`, `user_id` puesto, `cover_channel = bring`.
- Suma `fulfilled_quantity`. El cupo es el mismo: `reserved + fulfilled + quantity ≤ needed`. Si no entra, no anota.
- Aparecer: si viene nombre, `is_anonymous = false` y ese nombre. Si no, anónima.
- No cuenta para el tope de cinco reservas activas.

Si lo que trajo no está en el catálogo, primero se carga el ítem en Catálogo y después se atribuye. No hay material sin ítem.

Quien entre a `/cuenta` ve esas entregas en Mis donaciones.

## Errores

| Caso | Qué pasa |
|---|---|
| Sin nombre | No guarda |
| Mail ya existe | No crea otra; enlace a la ficha |
| Sin clave de Auth | El alta no se muestra |
| Ítem sin cupo | Lo dice; no anota |
| Invite vencido | «Volver a generar» |

## Pruebas

- Dominio: el local del mail inventado (tildes, vacío → `alguien`, choque `-2`).
- Caso de uso: provisión, aporte con `user_id`, llegada directa. Rojo antes de implementar.
- pgTAP: `provision_donor_account` y `record_donor_arrival` niegan a editor y donante; el insert autenticado sigue en `pending`; el cupo del ítem no se pasa.
- E2E (`con-datos`): owner crea sin mail, ve `@lacasadenorma.com` y el enlace; carga plata y un ítem; la persona no entra a `/admin`.

## Documentación en el mismo commit

- Enmendar ADR-033: cuenta creada por admin/owner nace `approved`.
- Runbook: el primer owner sigue siendo SQL; las personas que donan por fuera se cargan acá.
- `docs/security.md`: `roles.escribir` sigue sin pantalla. Esto no la abre.

## Fuera de alcance

- Otorgar `editor` / `admin` / `owner`.
- Reescribir aportes viejos para engancharlos.
- Material que no es un ítem del catálogo.
- Elegir persona desde `/admin/aportes`.
- Que el mail inventado reciba correo (no hay casilla).
