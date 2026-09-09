-- Invariantes de estructura del esquema.
--
-- Todo lo que hay acá está escrito como **una consulta al catálogo** en lugar de
-- una aserción por tabla. La diferencia importa: una lista de tablas se escribe
-- una vez y queda vieja en la primera migración que agrega una tabla nueva, y esa
-- tabla nueva entraría sin RLS sin que nada se queje. Una consulta que pregunta
-- "¿qué tabla de `public` no tiene RLS?" cubre también las que todavía no existen.
--
-- Por eso casi todas las aserciones son `is_empty`: el resultado esperado es
-- "ninguna fila", y cuando falla pgTAP imprime exactamente qué objeto la rompió.
--
-- Los objetos que instala una extensión se excluyen en todas las consultas
-- (`pg_depend.deptype = 'e'`). En la base de pruebas pgTAP se instala en `public`
-- y trae sus propias vistas y funciones, que no son de este proyecto y no tienen
-- por qué cumplir sus reglas.

begin;
select plan(33);

-- ── RLS ─────────────────────────────────────────────────────────────────────

select is_empty(
  $q$
    select c.relname::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and not c.relrowsecurity
       and not exists (
         select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e'
       )
  $q$,
  'toda tabla de public tiene RLS habilitada'
);

-- Una tabla con RLS y sin ninguna policy no devuelve nada, así que es segura. Pero
-- casi siempre es un olvido: alguien habilitó RLS y no escribió la policy, y el
-- síntoma es una pantalla vacía en producción, no un error. Se asserta a propósito.
select is_empty(
  $q$
    select c.relname::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relrowsecurity
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
       and not exists (
         select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e'
       )
  $q$,
  'toda tabla con RLS tiene al menos una policy'
);

-- ── audit_log es append-only (amenaza T2) ───────────────────────────────────
-- La garantía de T2 no es una policy: es la **ausencia** de dos policies. Sin
-- policy de UPDATE ni de DELETE, Postgres niega esas operaciones a todos los
-- roles, incluido `owner`. Como es una ausencia, hay que asertarla explícitamente
-- o nadie se entera el día que alguien agrega `audit_log_delete`.

select policies_are(
  'public',
  'audit_log',
  array['audit_log_select', 'audit_log_insert'],
  'audit_log tiene exactamente dos policies: leer y agregar (T2)'
);

select is_empty(
  $q$
    select policyname::text
      from pg_policies
     where schemaname = 'public'
       and tablename = 'audit_log'
       and cmd in ('UPDATE', 'DELETE', 'ALL')
  $q$,
  'audit_log no tiene ninguna policy de UPDATE ni de DELETE, tampoco para owner (T2)'
);

-- La ausencia de policy es la mitad de la garantía. La otra mitad es el privilegio,
-- y no es redundante: **TRUNCATE ignora RLS por completo**. Una sola policy no
-- podría detenerlo; lo único que lo detiene es que el GRANT no exista. Por eso acá
-- se enumera la lista entera de privilegios en lugar de comprobar la ausencia de
-- DELETE: así también queda dicho que no hay TRUNCATE, ni REFERENCES, ni TRIGGER.

select table_privs_are(
  'public', 'audit_log', 'authenticated',
  array['SELECT', 'INSERT'],
  'authenticated sobre audit_log tiene exactamente SELECT e INSERT: ni UPDATE, ni DELETE, ni TRUNCATE (T2)'
);

select table_privs_are(
  'public', 'audit_log', 'anon',
  array[]::text[],
  'anon no tiene ningún privilegio sobre audit_log'
);

-- ── Vistas (amenaza I3) ─────────────────────────────────────────────────────
-- Las vistas de Postgres se ejecutan con los privilegios de quien las creó, así
-- que **bypasean RLS por defecto**. Una vista sobre `contributions` sin
-- `security_invoker` publicaría los aportes individuales a cualquiera.

select has_view('public', 'campaign_totals', 'existe la vista pública de totales');

select is_empty(
  $q$
    select c.relname::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'v'
       and not exists (
         select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e'
       )
       and coalesce(array_to_string(c.reloptions, ','), '') !~ 'security_invoker=(true|on)'
  $q$,
  'toda vista de public tiene security_invoker = true (I3)'
);

-- Una vista materializada no tiene `security_invoker`: la opción no existe para
-- ellas. Sus filas se calculan una vez, con los privilegios de quien refresca, y
-- después se leen como una tabla que **no tiene RLS**. Sobre `contributions` sería
-- exactamente la fuga que I3 describe, sin ninguna opción que la evite. Por eso lo
-- que se asserta no es una configuración sino que no exista ninguna.
select is_empty(
  $q$
    select c.relname::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'm'
       and not exists (
         select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e'
       )
  $q$,
  'no hay vistas materializadas en public: no admiten security_invoker y bypasean RLS siempre (I3)'
);

-- ── Funciones security definer (amenaza E3) ─────────────────────────────────
-- Una función `security definer` corre con los privilegios de su dueño. Sin
-- `search_path` fijo, quien la invoca elige qué `public.algo` resuelve adentro, y
-- eso convierte a la función en un camino de escalada.

select is_empty(
  $q$
    select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
       and p.prosecdef
       and not exists (
         select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
       )
       and not exists (
         select 1
           from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg
          where cfg like 'search\_path=%'
       )
  $q$,
  'toda función security definer fija su search_path (E3)'
);

-- ── Quién puede invocar qué en el esquema private (T083, amenaza E3) ────────
-- Postgres otorga EXECUTE a PUBLIC en toda función nueva. Una función de
-- autorización con ese grant por defecto es un endpoint público: cualquiera puede
-- llamarla y usarla como oráculo. Las funciones de este esquema lo revocan una por
-- una, y esto fija el resultado en lugar de confiar en que el REVOKE se escribió.
--
-- Se excluyen las funciones de trigger: devuelven `trigger`, no se pueden invocar
-- directamente —Postgres aborta con "trigger functions can only be called as
-- triggers"— y por lo tanto su grant no es una superficie. 020-lectura-publica.sql
-- lo comprueba ejecutándolo, para que la exclusión no se apoye en una creencia.

select results_eq(
  $q$
    select p.oid::regprocedure::text collate "default"
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private'
       and p.prorettype <> 'trigger'::regtype
       and has_function_privilege('anon', p.oid, 'execute')
     order by 1
  $q$,
  $q$ values ('private.campaign_totals_for(uuid)') $q$,
  'la única función invocable de private que anon puede ejecutar es el agregado de la vista pública (E3)'
);

-- `authenticated` sí necesita EXECUTE sobre las funciones de autorización: una
-- policy se evalúa con los privilegios de quien consulta, así que sin el grant toda
-- policy que las nombre fallaría con "permission denied for function". Lo que
-- importa es que la lista sea exactamente esa y no crezca sin que nadie lo note.
select results_eq(
  $q$
    select p.oid::regprocedure::text collate "default"
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private'
       and p.prosecdef
       and has_function_privilege('authenticated', p.oid, 'execute')
     order by 1
  $q$,
  $q$
    values ('private.campaign_totals_for(uuid)'),
           ('private.can_read_ledger()'),
           ('private.has_min_role(app_role)')
  $q$,
  'authenticated puede invocar exactamente tres funciones security definer de private (E3)'
);

-- El hook del token corre con los privilegios que le da el servidor de auth y
-- resuelve el rol de cualquier `user_id` que se le pase. Si `authenticated` pudiera
-- ejecutarlo, sería una forma de averiguar quién administra el sitio.
select is_empty(
  $q$
    select r.rol
      from (values ('public'), ('anon'), ('authenticated')) as r(rol)
     where has_function_privilege(r.rol, 'public.custom_access_token_hook(jsonb)', 'execute')
  $q$,
  'el hook del token no lo puede ejecutar ni PUBLIC, ni anon, ni authenticated: lo invoca el servidor de auth (E3)'
);

-- ── Índices exigidos por las policies (T050) ────────────────────────────────
-- Una policy se evalúa por fila. Si filtra por una columna sin índice, cada
-- lectura es un scan completo de la tabla.
--
-- Qué hace esta comprobación: toma el texto de `USING` y `WITH CHECK` de cada
-- policy, le saca las cadenas literales —`'owner'::app_role` no es una referencia
-- a la columna `owner` de `storage.objects`— y busca qué columnas de esa misma
-- tabla aparecen nombradas. Para cada una exige un índice que la tenga como
-- **primera** columna, que es la única posición que un btree puede usar sola.
--
-- Qué NO cataloga:
--   · columnas de otra tabla nombradas dentro de un `exists (...)`; acá eso es
--     `updates.published_at` desde `update_media`, y está indexada por su cuenta;
--   · columnas que aparecen dentro de una expresión que el planificador no puede
--     resolver con un índice de todos modos;
--   · falsos positivos por una columna que se llame igual que una palabra del
--     texto de la policy fuera de una cadena literal.
-- Es deliberadamente conservadora: prefiere exigir un índice de más antes que
-- dejar pasar una policy que escanea la tabla entera.

select is_empty(
  $q$
    with texto_policies as (
      select c.oid as relid,
             p.schemaname,
             p.tablename,
             string_agg(
               regexp_replace(
                 coalesce(p.qual, '') || ' ' || coalesce(p.with_check, ''),
                 '''[^'']*''', ' ', 'g'
               ),
               ' '
             ) as texto
        from pg_policies p
        join pg_namespace n on n.nspname = p.schemaname
        join pg_class c on c.relname = p.tablename and c.relnamespace = n.oid
       where p.schemaname in ('public', 'storage')
       group by c.oid, p.schemaname, p.tablename
    ),
    columnas_filtradas as (
      select t.relid, t.schemaname, t.tablename, a.attname::text as columna, a.attnum
        from texto_policies t
        join pg_attribute a
          on a.attrelid = t.relid and a.attnum > 0 and not a.attisdropped
       where t.texto ~ ('\m' || a.attname || '\M')
    )
    select cf.schemaname || '.' || cf.tablename || '.' || cf.columna
      from columnas_filtradas cf
     where not exists (
       select 1
         from pg_index i
        where i.indrelid = cf.relid
          and i.indkey[0] = cf.attnum
     )
     order by 1
  $q$,
  'toda columna que filtra una policy tiene un índice que la lidera (T050)'
);

-- La aserción de arriba tiene un problema que hay que resolver acá: si mañana
-- ninguna policy filtrara por ninguna columna —porque alguien las reescribió todas
-- como `using (true)`, por ejemplo— el conjunto quedaría vacío y seguiría pasando
-- en verde sin comprobar nada.
--
-- Esta fija la lista exacta que hoy sale de `pg_policies`. No es una lista
-- adivinada: es el resultado de la misma extracción de arriba, escrito para que un
-- cambio en las policies tenga que pasar por acá. Si aparece una columna nueva, la
-- prueba lo dice y hay que decidir si merece índice; si desaparece una, también.
select results_eq(
  $q$
    with texto_policies as (
      select c.oid as relid,
             p.schemaname,
             p.tablename,
             string_agg(
               regexp_replace(
                 coalesce(p.qual, '') || ' ' || coalesce(p.with_check, ''),
                 '''[^'']*''', ' ', 'g'
               ),
               ' '
             ) as texto
        from pg_policies p
        join pg_namespace n on n.nspname = p.schemaname
        join pg_class c on c.relname = p.tablename and c.relnamespace = n.oid
       where p.schemaname in ('public', 'storage')
       group by c.oid, p.schemaname, p.tablename
    )
    select (t.schemaname || '.' || t.tablename || '.' || a.attname)::text collate "default"
      from texto_policies t
      join pg_attribute a
        on a.attrelid = t.relid and a.attnum > 0 and not a.attisdropped
     where t.texto ~ ('\m' || a.attname || '\M')
     order by 1
  $q$,
  $q$
    values ('public.budget_items.published_at'),
           ('public.campaigns.published_at'),
           ('public.expenses.published_at'),
           ('public.expenses.voided_at'),
           ('public.milestones.published_at'),
           ('public.payment_methods.published_at'),
           ('public.people.published_at'),
           ('public.update_media.update_id'),
           ('public.updates.published_at'),
           ('storage.objects.bucket_id')
  $q$,
  'las policies filtran exactamente por estas diez columnas: una policy que filtre por otra tiene que pasar por esta prueba (T050)'
);

-- Y los índices que data-model.md §4 nombra uno por uno, con su nombre real. La
-- comprobación de arriba los cubre a casi todos por catálogo, pero no a los que
-- ninguna policy nombra y que igual hacen falta: `contributions(campaign_id)` y
-- `expense_receipts(expense_id)` los usa la consulta de la vista agregada, y
-- `user_roles(user_id)` lo usa el hook del token en cada emisión.

select has_index('public', 'campaigns', 'campaigns_published_at_idx',
  array['published_at']::name[], 'campaigns(published_at): lo filtra la policy de lectura pública');

select has_index('public', 'expenses', 'expenses_published_at_idx',
  array['published_at']::name[], 'expenses(published_at): lo filtra la policy de lectura pública');

select has_index('public', 'expenses', 'expenses_campaign_idx',
  array['campaign_id', 'spent_at']::name[], 'expenses(campaign_id, spent_at): el libro de gastos de una campaña, en orden');

select has_index('public', 'contributions', 'contributions_campaign_idx',
  array['campaign_id', 'received_at']::name[], 'contributions(campaign_id): lo recorre la vista agregada de totales');

select has_index('public', 'expense_receipts', 'expense_receipts_expense_idx',
  array['expense_id']::name[], 'expense_receipts(expense_id): lo recorre el contador de comprobantes');

select has_index('public', 'update_media', 'update_media_update_idx',
  array['update_id', 'sort_order']::name[], 'update_media(update_id): lo filtra la policy que hereda la visibilidad de la novedad');

select has_index('public', 'updates', 'updates_published_at_idx',
  array['published_at']::name[], 'updates(published_at): lo filtra la policy de lectura pública');

select has_index('public', 'updates', 'updates_slug_idx',
  array['slug']::name[], 'updates(slug): resuelve la ruta de una novedad (FR-027)');

select has_index('public', 'media', 'media_storage_path_idx',
  array['storage_path']::name[], 'media(storage_path): vincula la fila con el archivo del bucket');

select has_index('public', 'user_roles', 'user_roles_user_id_idx',
  array['user_id']::name[], 'user_roles(user_id): lo resuelve el hook del token en cada emisión');

-- ── published_at es la frontera de lo público (T047, amenaza I7) ────────────
-- `published_at` nulo significa borrador en todas las tablas que tienen la
-- columna. La comprobación de que el borrador efectivamente no se ve está en
-- 020-lectura-publica.sql, que consulta como `anon`; esta es la mitad estructural:
-- que ninguna tabla se agregue con la columna y sin la policy que la usa.
--
-- Sin esto, una tabla nueva con `published_at` y una policy de `anon` escrita como
-- `using (true)` publicaría todos sus borradores, y la prueba de lectura sólo lo
-- notaría si alguien se acordara de agregarle un caso.

select is_empty(
  $q$
    select c.relname::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a
        on a.attrelid = c.oid and a.attname = 'published_at' and not a.attisdropped
     where n.nspname = 'public'
       and c.relkind = 'r'
       and not exists (
         select 1
           from pg_policies p
          where p.schemaname = 'public'
            and p.tablename = c.relname
            and p.cmd = 'SELECT'
            and p.roles @> array['anon']::name[]
            and p.qual like '%published_at IS NOT NULL%'
       )
     order by 1
  $q$,
  'toda tabla con published_at condiciona la lectura de anon a que no sea nulo (I7)'
);

-- ── auth.*() envuelto en subselect (T049) ───────────────────────────────────
-- `auth.uid()` suelto en una policy se evalúa una vez por fila; `(select auth.uid())`
-- una vez por consulta. Es el aviso `auth_rls_initplan` de los advisors.
--
-- En este esquema ninguna policy llama a `auth.*()` directamente: todas pasan por
-- `private.has_min_role()` o `private.can_read_ledger()`, que son `stable`. Así que
-- la comprobación se hace en los dos lugares donde puede aparecer: el texto de las
-- policies (hoy vacío de `auth.`, y la aserción existe para que siga estándolo) y
-- el cuerpo de las funciones del proyecto, que es donde las llamadas viven.
--
-- La técnica: borrar del texto todo `(select auth.loquesea())` y después buscar si
-- quedó algún `auth.` suelto. Lo que sobrevive es una llamada sin envolver.

select is_empty(
  $q$
    select (schemaname || '.' || policyname)::text
      from pg_policies
     where schemaname in ('public', 'storage')
       and regexp_replace(
             coalesce(qual, '') || ' ' || coalesce(with_check, ''),
             '\(\s*select\s+auth\.[a-z_]+\(\s*\)\s*\)', ' ', 'gi'
           ) ~* '\mauth\.'
  $q$,
  'ninguna policy llama a auth.*() fuera de un subselect (T049)'
);

select is_empty(
  $q$
    select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
       and not exists (
         select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
       )
       and regexp_replace(
             p.prosrc, '\(\s*select\s+auth\.[a-z_]+\(\s*\)\s*\)', ' ', 'gi'
           ) ~* '\mauth\.'
  $q$,
  'ninguna función del proyecto llama a auth.*() fuera de un subselect (T049)'
);

-- ── Forma de las policies ───────────────────────────────────────────────────

-- Sin `with check`, un UPDATE puede dejar la fila en un estado que la policy no
-- habría permitido crear (amenaza E4).
select is_empty(
  $q$
    select (tablename || '.' || policyname)::text
      from pg_policies
     where schemaname in ('public', 'storage')
       and cmd = 'UPDATE'
       and (qual is null or with_check is null)
  $q$,
  'toda policy de UPDATE lleva USING y WITH CHECK (E4)'
);

-- `for all` mezcla la condición de lectura con la de escritura: la misma
-- expresión termina siendo `using` de SELECT/UPDATE/DELETE y `with check` de
-- INSERT, y un error queda escondido en el medio.
select is_empty(
  $q$
    select (tablename || '.' || policyname)::text
      from pg_policies
     where schemaname in ('public', 'storage')
       and cmd = 'ALL'
  $q$,
  'ninguna policy se declara con for all: las escrituras van por comando'
);

-- Dos policies permisivas para la misma tabla, comando y rol se evalúan las dos en
-- cada fila. Es el aviso `multiple_permissive_policies` y un costo real.
--
-- `storage.objects` queda fuera a propósito: es **una** tabla que sirve los dos
-- buckets, así que `fotos_insert` y `comprobantes_insert` conviven por definición
-- y lo que las separa es el `bucket_id`.
select is_empty(
  $q$
    with expandido as (
      select tablename, cmd, unnest(roles) as rol
        from pg_policies
       where schemaname = 'public'
         and permissive = 'PERMISSIVE'
    )
    select tablename || ' ' || cmd || ' ' || rol
      from expandido
     group by tablename, cmd, rol
    having count(*) > 1
  $q$,
  'no hay dos policies permisivas para la misma tabla, comando y rol'
);

-- La lectura pública y la interna van en policies separadas por rol. Si una sola
-- policy dijera `to anon, authenticated` y nombrara `private.has_min_role`, habría
-- que otorgarle EXECUTE a `anon`, que es exactamente lo que la amenaza E3 prohíbe.
select is_empty(
  $q$
    select (tablename || '.' || policyname)::text
      from pg_policies
     where schemaname = 'public'
       and roles @> array['anon']::name[]
       and array_length(roles, 1) > 1
  $q$,
  'ninguna policy de public mezcla anon con otro rol: la lectura pública va aparte (E3)'
);

-- ── Privilegios, que son una capa distinta de RLS ───────────────────────────
-- RLS filtra filas; el GRANT decide si la operación es siquiera posible. Las
-- tablas del libro no le otorgan nada a `anon`, y eso es una segunda barrera: si
-- alguien agregara por error una policy de lectura para `anon`, la consulta
-- seguiría fallando por falta de privilegio.
select is_empty(
  $q$
    select table_name::text || ' ' || privilege_type::text
      from information_schema.role_table_grants
     where table_schema = 'public'
       and grantee = 'anon'
       and table_name in ('contributions', 'expense_receipts', 'user_roles', 'audit_log')
  $q$,
  'anon no tiene ningún privilegio sobre aportes, comprobantes, roles ni auditoría (I1, I2)'
);

select * from finish();
rollback;
