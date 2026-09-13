-- Qué se intentó mandar, y qué pasó. Sólo se agrega.
--
-- ── Por qué existe una tabla para esto ──────────────────────────────────────
--
-- Porque el correo **no está en el camino crítico** de la reserva
-- ([ADR-028](../../docs/adr/028-correo-resend.md)). La reserva se confirma en su
-- propia transacción y el correo se intenta después: si el proveedor está caído, la
-- reserva ya está hecha y la pantalla muestra los datos de entrega en lugar de
-- prometer un correo que no llegó (FR-233, FR-234).
--
-- Esa decisión tiene una consecuencia que hay que aceptar entera: **el fallo lo ve
-- alguien del equipo, no la persona que esperaba el correo**. Para que "alguien lo
-- vea" sea posible y no una intención, el intento tiene que quedar escrito en algún
-- lado. Ese lado es esta tabla, y es la razón por la que un envío `skipped` —sin
-- credencial configurada— también deja fila: un entorno sin configurar y un
-- proveedor caído se ven distinto acá y se responden distinto.
--
-- ── Y por qué se parece tanto a audit_log ───────────────────────────────────
--
-- Misma forma y por el mismo motivo (ADR-019): **no hay policy de insert, de update
-- ni de delete**, y la ausencia es la garantía. La única vía de escritura es
-- `record_email_delivery()`. Lo que se intentó mandar no se corrige después, porque
-- corregirlo sería poder borrar la evidencia de que a alguien no le llegó nada.

create table public.email_deliveries (
  id bigint generated always as identity primary key,

  -- Las cuatro clases del puerto (`src/domain/ports/email.ts`). El `check` es de
  -- forma y no de lista: los tres correos de identidad los manda GoTrue por SMTP y
  -- no pasan por acá, pero una clase nueva del producto no debería necesitar una
  -- migración. Lo que sí tiene que ser imposible es un `kind` que no sea un
  -- identificador, porque esta columna se lee en el backoffice y se agrupa por ella.
  kind text not null,

  -- Nulo mientras no haya reserva a la cual atribuirlo. La referencia a
  -- `donation_pledges` la agrega la migración que crea esa tabla (T043): una clave
  -- foránea no se puede declarar contra una tabla que todavía no existe, y esta
  -- tabla se entrega antes a propósito —el equipo ya puede recibir correo del
  -- sistema sin que exista el catálogo.
  pledge_id uuid,

  -- **La resuelve la función, no quien llama.** Es la mitad de ADR-028 que no se ve
  -- leyendo el tipo: si esta columna llegara por parámetro, el registro de envíos
  -- sería un lugar donde una cuenta del público puede anotar —o descubrir por
  -- diferencia— la dirección de otra persona.
  recipient text,

  -- `skipped` no es `failed`, y la diferencia no es cosmética: la primera es una
  -- decisión de despliegue —no hay credencial— y la segunda es un problema que
  -- alguien tiene que mirar. Confundirlas haría que un entorno sin configurar se
  -- viera como un proveedor caído.
  status text not null,

  -- El `id` que devuelve Resend. Es lo único que permite cruzar una fila de acá con
  -- su entrada en la consola del proveedor cuando alguien dice "no me llegó".
  provider_id text,

  -- Sin cuerpo del mensaje, sin token y sin secretos (principio X). La función lo
  -- recorta, así que un volcado del proveedor no puede entrar entero por acá.
  error text,

  occurred_at timestamptz not null default now(),

  constraint email_deliveries_kind_shape check (kind ~ '^[a-z_]+\.[a-z_]+$'),

  constraint email_deliveries_status_known check (status in ('sent', 'failed', 'skipped')),

  -- El aviso al equipo **no tiene destinatario en la base**, y los otros tres no
  -- pueden no tenerlo. La dirección del equipo vive en `EMAIL_STAFF_ADDRESS`, en el
  -- entorno del servidor: copiarla acá sería mudar un dato de configuración a una
  -- tabla de datos personales, y quedaría desactualizada el día que cambie.
  constraint email_deliveries_recipient_matches_kind check (
    case
      when kind like 'staff.%' then recipient is null
      else recipient is not null and length(btrim(recipient)) > 0
    end
  ),

  -- Un `provider_id` sin envío y un `error` sin fallo son filas que se contradicen
  -- solas. Se vuelven imposibles acá para que una consulta del backoffice pueda
  -- confiar en la forma en lugar de defenderse de ella.
  constraint email_deliveries_provider_id_only_when_sent check (
    provider_id is null or status = 'sent'
  ),

  constraint email_deliveries_error_only_when_failed check (
    error is null or status = 'failed'
  )
);

comment on table public.email_deliveries is
  'Cada intento de envío de los correos del producto. Sólo se agrega; la dirección la resuelve record_email_delivery() (ADR-028).';

-- ── La segunda capa de idempotencia, que es la que no vence ─────────────────
--
-- La primera es el header `Idempotency-Key` de Resend, y dura **24 horas**. El
-- proceso de recordatorios corre todos los días: a las 25 horas la clave ya no
-- frenaría el segundo correo. La deduplicación permanente tiene que vivir acá
-- (FR-235, SC-210).
--
-- Es un índice y no una convención a propósito. "El proceso consulta antes de
-- mandar" es una regla que se cumple hasta el día que alguien escribe un segundo
-- proceso; un índice único falla siempre. El precio es que **un reenvío deliberado
-- del mismo correo no se puede anotar**, y eso es lo correcto: si alguna vez hace
-- falta reenviar, es una operación nueva y va a necesitar decir que lo es.
--
-- Parcial sobre `status = 'sent'` porque un fallo se reintenta: lo que no se repite
-- es un envío que salió bien.
create unique index email_deliveries_sent_once_per_pledge
  on public.email_deliveries (kind, pledge_id)
  where status = 'sent' and pledge_id is not null;

-- La consulta del backoffice: qué pasó con los correos de esta reserva.
create index email_deliveries_pledge_idx
  on public.email_deliveries (pledge_id, occurred_at desc);

alter table public.email_deliveries enable row level security;

-- ── Quién lee: los tres de can_read_donors(), y ninguno más ─────────────────
--
-- `recipient` es una dirección de correo de alguien que donó, así que esta tabla es
-- un índice de datos personales y se protege con la misma función que los protege en
-- `donor_profiles`, no con el rango.
--
-- Es la lección de `can_read_ledger()` por tercera vez: `editor` es rango 2 y
-- `auditor` rango 1, así que `has_min_role('auditor')` acá le abriría a `editor` las
-- direcciones de correo de quienes se comprometieron a traer algo. `editor`
-- administra el catálogo —qué falta, cuánto, con qué foto— y no ve una dirección.
create policy email_deliveries_select on public.email_deliveries
  for select to authenticated
  using (private.can_read_donors());

-- Y nada más. Ni para `owner`: lo que se intentó mandar no se edita ni se borra.
grant select on public.email_deliveries to authenticated;

-- ── La única vía de escritura ───────────────────────────────────────────────
--
-- Los parámetros llevan prefijo `p_` por lo mismo que en `record_audit()`: adentro
-- de plpgsql un parámetro llamado `status` sería ambiguo con la columna `status` del
-- `insert`, y esa ambigüedad la resuelve Postgres en tiempo de ejecución y no
-- siempre a favor de lo que uno quiso.
--
-- **No recibe la dirección de destino.** Recibe, como mucho, de quién es el correo,
-- y la dirección la busca en `auth.users`. La diferencia es toda la decisión: una
-- cuenta del público no puede anotar un envío a una dirección ajena porque no hay
-- parámetro donde escribirla, y no puede descubrir la de otra persona porque
-- apuntarle a otra cuenta pide `can_read_donors()` y leer la tabla también.
--
-- `p_user_id` existe por el proceso de recordatorios (FR-235, T053): ese correo lo
-- dispara un proceso diario y no la persona que lo recibe, así que alguien con rol
-- interno tiene que poder decir de quién es el envío. Nulo significa "mío", que es
-- el caso de los otros tres.

create or replace function public.record_email_delivery(
  p_kind text,
  p_pledge_id uuid,
  p_status text,
  p_provider_id text default null,
  p_error text default null,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- El subselect no es estilo: la función de sesión suelta se evalúa una vez por
  -- fila (aviso `auth_rls_initplan`), y `010-estructura.sql` rechaza el cuerpo de
  -- una función que la llame sin envolver.
  v_actor uuid := (select auth.uid());
  v_target uuid := coalesce(p_user_id, (select auth.uid()));
  v_recipient text;
begin
  -- `anon` no tiene el EXECUTE, así que para él la llamada falla antes de llegar
  -- hasta acá. Esto cubre el otro caso: un token válido sin `sub`, que es lo que
  -- trae una credencial de servicio.
  if v_actor is null then
    raise exception 'Registrar un envío necesita una sesión.'
      using errcode = '42501';
  end if;

  if v_target <> v_actor and not private.can_read_donors() then
    raise exception 'Sólo un rol interno puede registrar un envío de otra cuenta.'
      using errcode = '42501';
  end if;

  if p_kind = 'staff.new_pledge' then
    -- La dirección del equipo no está en la base y no debería estar. La fila queda
    -- con destinatario nulo, que es exacto: se sabe que se intentó y no hace falta
    -- saber a dónde, porque es siempre el mismo lugar.
    v_recipient := null;
  else
    select u.email into v_recipient
      from auth.users u
     where u.id = v_target;

    if v_recipient is null then
      raise exception 'No hay a quién atribuirle ese envío.'
        using errcode = '42501';
    end if;
  end if;

  insert into public.email_deliveries (
    kind, pledge_id, recipient, status, provider_id, error
  )
  values (
    p_kind,
    p_pledge_id,
    v_recipient,
    p_status,
    p_provider_id,
    -- Recortado y normalizado: el adaptador ya manda una causa corta y sin
    -- secretos, y esto es la red por si alguna vez manda el cuerpo entero de una
    -- respuesta del proveedor.
    nullif(btrim(left(coalesce(p_error, ''), 500)), '')
  );
end;
$$;

-- Postgres otorga EXECUTE a PUBLIC en toda función nueva (amenaza E3), y con el
-- registro del público abierto eso dejó de ser improbable.
revoke all on function public.record_email_delivery(text, uuid, text, text, text, uuid)
  from public;

grant execute on function public.record_email_delivery(text, uuid, text, text, text, uuid)
  to authenticated;

comment on function public.record_email_delivery(text, uuid, text, text, text, uuid) is
  'La única vía de escritura de email_deliveries. La dirección sale de auth.users, nunca del argumento (ADR-028).';
