# Fase 1 — Cómo levantarlo y cómo verificarlo

Sigue valiendo lo del README: el sitio levanta sin ninguna credencial. Esta feature agrega tres
niveles de configuración, y cada uno habilita más cosas.

| Configurado | Qué funciona |
|---|---|
| Nada | El sitio de siempre. El catálogo y el muro se omiten con aviso (FR-034) |
| Supabase | Catálogo, cuentas, reservas y muro. Sin correo: se registra `skipped` y la pantalla lo dice |
| Supabase + `RESEND_API_KEY` | Todo, incluidos los seis correos |

Que el segundo nivel sea usable no es una concesión: es FR-233, y es lo que hace que una caída del
proveedor de correo no sea una caída del catálogo.

## Base de datos local

```bash
npm run db:bootstrap   # una vez por máquina
npm run db:verify      # reset + migraciones + lint + advisors + pgTAP + tipos --check
npm run db:fixture     # datos de desarrollo, ahora con ítems y reservas de ejemplo
```

`db:verify` es la compuerta de esta feature: sin pgTAP en verde no se pushea nada de la fase A.

El plazo de 14 días **no suelta** el ítem. Avisa al equipo. Para soltarlo, el admin cancela a mano.

## Verificar sin interfaz, antes de que haya interfaz

Cada propiedad crítica se puede comprobar con `psql` sobre la base local, simulando la sesión como lo
hace PostgREST: cambiar de rol y fijar `request.jwt.claims`. Es lo que hacen las pruebas pgTAP, y es
la forma de ver una policy en rojo antes de escribir la pantalla.

```sql
-- Una cuenta del público: autenticada, sin fila en user_roles.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated","app_metadata":{}}';

select private.has_min_role('auditor'), private.can_read_ledger(), private.can_read_donors();
-- f | f | f  ← si alguna da true, la frontera de ADR-027 está rota

select count(*) from public.contributions;
-- 0  ← y NO un error: el privilegio está otorgado, la policy es la única barrera
rollback;
```

```sql
-- Los privilegios de columna del muro.
begin;
set local role anon;
select id, item_id, quantity, donor_display_name, fulfilled_at from public.donation_pledges; -- ok
select user_id from public.donation_pledges;  -- 42501: permission denied for table
rollback;
```

```sql
-- La sobreventa, atacada de frente y con todos los privilegios.
update public.donation_items set reserved_quantity = needed_quantity + 1 where id = '<uuid>';
-- ERROR: violates check constraint "donation_items_not_oversubscribed"
```

## Verificar la concurrencia

La propiedad que el pedido nombra —que no se done dos veces lo mismo— se comprueba con dos sesiones
de verdad. En dos terminales, sobre un ítem con **una** unidad disponible:

```sql
-- Terminal A
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-a>","role":"authenticated","app_metadata":{}}';
select public.claim_donation_item('<item>', 1);
select pg_sleep(3);   -- retiene el lock de la fila
commit;
```

```sql
-- Terminal B, arrancando un segundo después
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-b>","role":"authenticated","app_metadata":{}}';
select public.claim_donation_item('<item>', 1);
-- Espera el lock de A y después: ERROR: sin_disponibilidad
commit;
```

Al final tiene que haber **una** reserva y `remaining_quantity = 0`. Si hay dos, el `check` de la
tabla tendría que haber fallado antes, así que algo se rompió en dos lugares a la vez.

## Correo

Sin `RESEND_API_KEY`, `getEmailSender()` devuelve el que registra y no manda: los flujos se pueden
recorrer completos y cada intento queda como `skipped` en `email_deliveries`.

Con clave, el dominio tiene que estar verificado en Resend. Hasta entonces, sólo se puede mandar a la
dirección de prueba del proveedor. Los pasos están en `docs/runbook.md`.

Para los correos de identidad hay que configurar el SMTP en el panel del proyecto además de en
`config.toml`: sin eso, Supabase manda por su servicio incluido, con remitente ajeno y **dos correos
por hora** (`research.md` §3).

## Recorrido manual mínimo

En 360 px y en 1440 px, con teclado y con lector de pantalla:

1. `/catalogo` sin sesión: se ve qué falta y cuánto. Un ítem cubierto no ofrece reservar.
2. "Pedir donar esto" sin sesión → registro → confirmación por correo → **vuelve al mismo ítem**.
3. Reservar: aparece en `/cuenta` con su vencimiento.
4. Con otra sesión, reservar el mismo último ejemplar: mensaje diseñado, no un error.
5. Desde `/admin/donaciones`, confirmar la llegada.
6. `/quienes-ayudaron`: aparece el nombre. Con una reserva anónima, no aparece.
7. Cambiar el anonimato en `/cuenta`: el muro cambia.
8. Borrar la cuenta: la donación sigue contada, el nombre ya no está.

## Suites

```bash
npm run verify              # incluye check:rls
npm run db:verify           # pgTAP: matriz con la persona `donante`, columnas, concurrencia
npm run test:e2e:con-datos  # catálogo, cuenta, muro
npm run test:e2e:sin-datos  # que el catálogo se omita con aviso
```
