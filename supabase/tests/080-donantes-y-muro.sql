-- El perfil de una cuenta del público: sólo el propio, y todo el propio.
--
-- `030-matriz-de-permisos.sql` ya dice lo que una cuenta del público **no** puede:
-- ahí `donor_profiles` es una fila más de una matriz de 336 celdas y su veredicto
-- se mide contando filas. Eso alcanza para las negaciones y no alcanza para dos
-- cosas que este archivo cubre:
--
--   1. **Qué fila** ve, y no cuántas. Un bug que devolviera la fila de otra persona
--      en lugar de la propia daría el mismo veredicto —una fila— y la matriz lo
--      dejaría pasar.
--   2. Que el **camino legítimo** funcione. Una regla que impide crear el propio
--      perfil es igual de rota que una que deja editar el ajeno, y se descubre el
--      día del despliegue en lugar del día de la prueba.
--
-- Las policies de `donor_profiles` son las primeras del proyecto que se resuelven
-- por **propiedad** y no por rol: `id = (select auth.uid())`. Es el patrón que
-- ADR-027 introduce y el que van a copiar `donation_pledges` y todo lo que venga
-- después, así que se prueba acá una vez y bien.
--
-- Las dos cuentas se insertan dentro de la transacción y se revierten al terminar.

begin;
select plan(11);

insert into auth.users (id, email) values
  ('20000000-0000-4000-8000-000000000001', 'quien.dona@ejemplo.invalid'),
  ('20000000-0000-4000-8000-000000000002', 'quien.tambien.dona@ejemplo.invalid');

-- El perfil ajeno existe de entrada. El propio **no**: crearlo es el primer caso.
insert into public.donor_profiles (id, display_name, locale, default_anonymous) values
  ('20000000-0000-4000-8000-000000000002', 'Vecina de la cuadra', 'es', false);

-- ── Estructura ──────────────────────────────────────────────────────────────
-- Lo que las policies asumen. Sin la clave foránea con `on delete cascade`, borrar
-- la cuenta dejaría el perfil huérfano y el nombre publicado para siempre (FR-240).

select col_is_pk(
  'public', 'donor_profiles', 'id',
  'el perfil usa la misma clave que la cuenta: no hay un identificador nuevo que se pueda filtrar'
);

select fk_ok(
  'public', 'donor_profiles', 'id',
  'auth', 'users', 'id',
  'el perfil referencia auth.users, que es donde vive el correo y donde no se copia'
);

select is(
  (
    select confdeltype
      from pg_constraint
     where conrelid = 'public.donor_profiles'::regclass
       and contype = 'f'
  ),
  'c'::"char",
  'la referencia es on delete cascade: borrar la cuenta borra el perfil, y no hay forma de olvidarse (FR-240)'
);

select is_empty(
  $q$
    select 'default_anonymous = ' || default_anonymous
      from public.donor_profiles
     where id = '20000000-0000-4000-8000-000000000001'
  $q$,
  'la cuenta que va a crear su perfil todavía no tiene uno: lo que sigue no está midiendo una fila que ya estaba'
);

-- ── El camino legítimo, en el orden en que lo recorre una persona ───────────

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}';

insert into public.donor_profiles (id) values ('20000000-0000-4000-8000-000000000001');

update public.donor_profiles
   set display_name = 'Quien dona', default_anonymous = false, locale = 'en'
 where id = '20000000-0000-4000-8000-000000000001';

reset role;

select results_eq(
  $q$
    select display_name, locale, default_anonymous
      from public.donor_profiles
     where id = '20000000-0000-4000-8000-000000000001'
  $q$,
  $q$ values ('Quien dona'::text, 'en'::text, false) $q$,
  'una cuenta del público crea su perfil y elige su nombre público, su idioma y su anonimato (FR-208, FR-230, FR-232)'
);

-- El anonimato es el default, y es una decisión de producto: aparecer con nombre se
-- elige, no se hereda. Se afirma sobre la columna y no sobre una fila, porque lo que
-- importa es lo que pasa cuando la aplicación **no** manda el campo.
select is(
  (
    select column_default
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'donor_profiles'
       and column_name = 'default_anonymous'
  ),
  'true',
  'y el valor por defecto de la columna es el anonimato: quien no elige nada no aparece (FR-225)'
);

-- ── Lo que ve, y no cuántas filas ve ────────────────────────────────────────

create temporary table lo_que_ve (id uuid) on commit drop;

do $$
declare
  vistos uuid[];
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}',
    true
  );

  -- Se acumula en una variable y se guarda después, con el rol ya restituido:
  -- `authenticated` no tiene privilegio para escribir en una tabla temporal de esta
  -- sesión, y el registro de la prueba no puede depender de eso.
  select array_agg(p.id order by p.id) into vistos from public.donor_profiles p;

  reset role;
  perform set_config('request.jwt.claims', '', true);

  insert into lo_que_ve (id) select unnest(coalesce(vistos, '{}'::uuid[]));
end
$$;

select results_eq(
  $q$ select id from lo_que_ve order by id $q$,
  $q$ values ('20000000-0000-4000-8000-000000000001'::uuid) $q$,
  'lo que una cuenta del público lee de donor_profiles es su propia fila, y se verifica por identidad y no por cantidad (FR-203)'
);

-- ── Las negaciones que no se pueden medir contando ──────────────────────────
-- Un UPDATE negado por RLS **no lanza excepción**: afecta cero filas y devuelve
-- éxito (amenaza E5). Por eso acá se mira el dato después, igual que la prueba del
-- CBU de `030`: un test que sólo verificara que no hubo error pasaría también si el
-- nombre de la otra persona hubiera cambiado.

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}';

update public.donor_profiles
   set display_name = 'Nombre puesto por otra persona', default_anonymous = true
 where id = '20000000-0000-4000-8000-000000000002';

delete from public.donor_profiles where id = '20000000-0000-4000-8000-000000000002';

reset role;

select results_eq(
  $q$
    select display_name, default_anonymous
      from public.donor_profiles
     where id = '20000000-0000-4000-8000-000000000002'
  $q$,
  $q$ values ('Vecina de la cuadra'::text, false) $q$,
  'después de que otra cuenta del público intenta renombrarla, anonimizarla y borrarla, la vecina sigue con el nombre que eligió (FR-203, E5)'
);

-- La otra mitad de la propiedad: el `with check` del UPDATE. Sin él, una cuenta
-- podría mover su propia fila a un `id` ajeno y quedarse con el perfil de otra
-- persona, que es la amenaza E4 sobre datos personales.
create temporary table mudanza (motivo text) on commit drop;

do $$
declare
  resultado text;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}',
    true
  );

  begin
    update public.donor_profiles
       set id = '20000000-0000-4000-8000-000000000004'
     where id = '20000000-0000-4000-8000-000000000001';
    resultado := 'no falló';
  exception
    when others then
      resultado := sqlstate;
  end;

  reset role;
  perform set_config('request.jwt.claims', '', true);

  insert into mudanza (motivo) values (resultado);
end
$$;

select isnt(
  (select motivo from mudanza),
  'no falló',
  'una cuenta no puede mudar su perfil a un id ajeno: la policy de update lleva with check y no sólo using (E4)'
);

-- ── El idioma es una lista cerrada ──────────────────────────────────────────
-- `locale` decide en qué idioma sale cada correo (FR-232). Un valor que la
-- aplicación no sabe traducir tiene que ser imposible, no un correo en blanco.

select throws_ok(
  $s$
    update public.donor_profiles set locale = 'pt'
     where id = '20000000-0000-4000-8000-000000000001'
  $s$,
  '23514',
  null,
  'el idioma sólo puede ser es o en: los dos que el sitio publica (ADR-014, ADR-023)'
);

-- ── Un nombre en blanco no es un nombre ─────────────────────────────────────
-- `display_name` nulo significa "todavía no decidí aparecer". Una cadena de
-- espacios significaría lo mismo y se publicaría como un renglón vacío en el muro.

select throws_ok(
  $s$
    update public.donor_profiles set display_name = '   '
     where id = '20000000-0000-4000-8000-000000000001'
  $s$,
  '23514',
  null,
  'el nombre público es nulo o es un nombre: una cadena de espacios se publicaría como un renglón vacío'
);

select * from finish();
rollback;
