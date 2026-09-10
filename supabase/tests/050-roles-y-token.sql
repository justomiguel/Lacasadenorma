-- De dónde sale el rol de una persona.
--
-- La amenaza S3 es de una línea: si el rol se leyera de `user_metadata`, cualquiera
-- se haría `owner` editando su propio perfil, porque esa parte del token la escribe
-- el usuario. El rol vive en `public.user_roles`, el hook del servidor de auth lo
-- copia a `app_metadata` —que sólo escribe el servidor de auth— y las policies leen
-- únicamente de ahí.
--
-- Este archivo prueba las tres piezas: que `user_metadata` no sirva para nada, que
-- el hook resuelva bien, y que la función de rango no reviente con basura. Lo
-- último importa más de lo que parece: si `role_rank` fallara con un claim raro, la
-- policy que la llama fallaría con error en lugar de negar, y un error en una
-- lectura pública es una página caída.

begin;
select plan(21);

-- ── Fixture ─────────────────────────────────────────────────────────────────
-- `raw_user_meta_data` con `user_role: owner` es exactamente lo que escribiría
-- alguien que quiere escalar privilegios desde su propio perfil. Ninguna función
-- del esquema lee esa columna; está acá para que el fixture cuente la historia.

insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'impostora@ejemplo.test',
   '{"user_role": "owner"}'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'varios-roles@ejemplo.test', '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000003', 'sin-rol@ejemplo.test', '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000004', 'propiedad@ejemplo.test', '{}'::jsonb);

insert into public.campaigns (id, slug, title, summary, published_at)
values ('c0000000-0000-4000-8000-000000000001', 'casa-de-norma', 'La casa de Norma',
        'Reconstrucción de la casa', now());

insert into public.contributions (id, campaign_id, amount_minor, currency, received_at)
values ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
        100000, 'ARS', date '2026-08-01');

-- Una persona con dos roles: el hook tiene que resolver el de mayor rango.
insert into public.user_roles (user_id, role) values
  ('10000000-0000-4000-8000-000000000002', 'editor'),
  ('10000000-0000-4000-8000-000000000002', 'admin');

insert into public.user_roles (user_id, role) values
  ('10000000-0000-4000-8000-000000000004', 'owner');

-- ── Un rol en user_metadata no otorga nada (amenaza S3) ─────────────────────
-- El token que se simula acá es el peor caso realista: firma válida, sesión real,
-- y `user_role: owner` puesto por la propia persona en la parte del token que ella
-- controla. `app_metadata` no lo trae, y eso es lo único que las policies miran.

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","user_metadata":{"user_role":"owner"}}';

select is(
  private.has_min_role('auditor'),
  false,
  'un rol declarado en user_metadata no pasa ni el chequeo más bajo (S3)'
);

select is(
  private.can_read_ledger(),
  false,
  'un rol declarado en user_metadata no abre el libro (S3)'
);

select throws_ok(
  $q$
    insert into public.payment_methods (campaign_id, country_code, currency, label)
    values ('c0000000-0000-4000-8000-000000000001', 'AR', 'ARS', 'Cuenta de la impostora')
  $q$,
  '42501',
  null,
  'quien se declara owner en user_metadata no puede crear una cuenta de aporte (S3, T1)'
);

select throws_ok(
  $q$
    insert into public.expenses (campaign_id, amount_minor, currency, spent_at, concept, category)
    values ('c0000000-0000-4000-8000-000000000001', 1000, 'ARS', current_date, 'Un gasto', 'otros')
  $q$,
  '42501',
  null,
  'quien se declara owner en user_metadata tampoco registra un gasto (S3)'
);

select is(
  (select count(*) from public.contributions)::int,
  0,
  'quien se declara owner en user_metadata no lee ningún aporte (S3)'
);

-- El caso que decide la amenaza no es el token que **sólo** trae `user_metadata`,
-- sino el que trae los dos: una persona con rol real de `editor` que agrega
-- `user_role: owner` en la parte del token que ella controla. Si las policies
-- mezclaran las dos fuentes, o si `user_metadata` ganara, cualquier editor sería
-- dueño de las cuentas de aporte. Gana `app_metadata`, y `user_metadata` no suma.

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{
  "sub": "10000000-0000-4000-8000-000000000002",
  "role": "authenticated",
  "app_metadata": {"user_role": "editor"},
  "user_metadata": {"user_role": "owner"}
}';

select is(
  private.has_min_role('editor'),
  true,
  'con los dos metadatos presentes, el rol que vale es el de app_metadata (S3)'
);

select is(
  private.has_min_role('owner'),
  false,
  'un editor que se declara owner en user_metadata sigue siendo editor (S3)'
);

select throws_ok(
  $q$
    insert into public.payment_methods (campaign_id, country_code, currency, label)
    values ('c0000000-0000-4000-8000-000000000001', 'AR', 'ARS', 'Cuenta del editor ambicioso')
  $q$,
  '42501',
  null,
  'un editor que se declara owner en user_metadata no crea una cuenta de aporte (S3, T1)'
);

-- La otra forma de intentarlo: poner el rol en la raíz del token en lugar de en
-- `user_metadata`. Tampoco sirve, porque la función lee una ruta y sólo una.
reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","user_role":"owner"}';

select is(
  private.has_min_role('auditor'),
  false,
  'un user_role en la raíz del token tampoco otorga nada: sólo se lee app_metadata.user_role (S3)'
);

-- Una sesión iniciada sin ningún claim de rol: `app_metadata` vacío es el estado
-- de alguien que se registró y todavía no recibió permisos.
reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{}}';

select is(
  private.has_min_role('auditor'),
  false,
  'una sesión sin rol en app_metadata no es un rol interno'
);

-- El rango se compara de verdad: `admin` no alcanza donde se pide `owner`.
reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"user_role":"admin"}}';

select is(
  private.has_min_role('owner'),
  false,
  'admin no pasa un chequeo que pide owner'
);

select is(
  private.has_min_role('admin'),
  true,
  'admin sí pasa el chequeo de su propio rango'
);

-- ── El hook que arma el token ───────────────────────────────────────────────
-- Lo invoca el servidor de auth en cada emisión de token. Se prueba como
-- superusuario porque ningún rol de la aplicación puede ejecutarlo: el EXECUTE es
-- sólo de `supabase_auth_admin`.

reset role;

select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '10000000-0000-4000-8000-000000000002',
      'claims', '{"sub": "10000000-0000-4000-8000-000000000002", "app_metadata": {}}'::jsonb
    )
  ) -> 'claims' -> 'app_metadata' ->> 'user_role',
  'admin',
  'con varios roles, el token recibe el de mayor rango'
);

-- `jsonb_set` no crea niveles intermedios: sin la inicialización, fijar
-- {app_metadata,user_role} sobre un token que no trae `app_metadata` no haría nada
-- y la persona quedaría sin permisos sin ningún error visible.
select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '10000000-0000-4000-8000-000000000004',
      'claims', '{"sub": "10000000-0000-4000-8000-000000000004"}'::jsonb
    )
  ) -> 'claims' -> 'app_metadata' ->> 'user_role',
  'owner',
  'el hook crea app_metadata cuando el token entrante no lo trae'
);

select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '10000000-0000-4000-8000-000000000003',
      'claims', '{"sub": "10000000-0000-4000-8000-000000000003", "email": "sin-rol@ejemplo.test"}'::jsonb
    )
  ) -> 'claims' ->> 'email',
  'sin-rol@ejemplo.test',
  'el hook no toca los claims que ya venían en el token'
);

select is(
  jsonb_exists(
    public.custom_access_token_hook(
      jsonb_build_object(
        'user_id', '10000000-0000-4000-8000-000000000003',
        'claims', '{"sub": "10000000-0000-4000-8000-000000000003"}'::jsonb
      )
    ) -> 'claims' -> 'app_metadata',
    'user_role'
  ),
  false,
  'a quien no tiene ningún rol, el hook no le inventa uno'
);

-- ── El hook, con los privilegios de quien lo invoca de verdad ───────────────
-- Todo lo de arriba corre como superusuario, y eso deja sin probar la única cosa
-- que puede hacer que el hook no sirva para nada: los privilegios. El hook no es
-- `security definer`, así que corre con los del rol que lo llama, y ese rol es
-- siempre `supabase_auth_admin`. Un `grant` que falte no se ve desde acá arriba.
--
-- Faltaba uno. El hook ordena por `private.role_rank`, y `private` sólo tenía
-- `usage` para `anon` y `authenticated`: el servidor de auth cortaba con "permission
-- denied for schema private" al emitir cada token. Nadie habría podido entrar al
-- backoffice, y el síntoma habría aparecido en el primer intento de acceso contra el
-- proyecto real, no acá.

reset role;
set local role supabase_auth_admin;

select lives_ok(
  $q$
    select public.custom_access_token_hook(
      jsonb_build_object(
        'user_id', '10000000-0000-4000-8000-000000000002',
        'claims', '{"sub": "10000000-0000-4000-8000-000000000002"}'::jsonb
      )
    )
  $q$,
  'el servidor de auth puede ejecutar el hook con sus propios privilegios'
);

select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '10000000-0000-4000-8000-000000000002',
      'claims', '{"sub": "10000000-0000-4000-8000-000000000002"}'::jsonb
    )
  ) -> 'claims' -> 'app_metadata' ->> 'user_role',
  'admin',
  'y resuelve el mismo rol que resolvía con privilegios de superusuario'
);

reset role;

-- ── role_rank no se rompe con basura ────────────────────────────────────────
-- Recibe `text` y no el enum a propósito: un claim con cualquier cosa adentro tiene
-- que dar rango 0, no abortar la policy que la llama.

select results_eq(
  $q$
    select private.role_rank('auditor'), private.role_rank('editor'),
           private.role_rank('admin'), private.role_rank('owner')
  $q$,
  $q$ values (1, 2, 3, 4) $q$,
  'role_rank ordena los cuatro roles como APP_ROLES en el dominio'
);

select is(
  private.role_rank('superadministrador'),
  0,
  'role_rank devuelve 0 con un rol inventado, en lugar de fallar'
);

select is(
  private.role_rank(null),
  0,
  'role_rank devuelve 0 con null: un token sin rol no rompe la policy'
);

select * from finish();
rollback;
