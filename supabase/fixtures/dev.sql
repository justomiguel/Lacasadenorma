-- Fixture de desarrollo (ADR-015).
--
-- NO ES UN SEED. El CLI de Supabase aplica `supabase/seed.sql` automáticamente en
-- cada reset; este archivo se llama distinto y vive en otra carpeta a propósito.
-- Sólo se aplica cuando alguien escribe `npm run db:fixture`.
--
-- Todos los datos de acá son inventados, y **se declaran inventados en el propio
-- dato**: los campos de la cuenta dicen "CUENTA DE PRUEBA — NO TRANSFERIR". Si
-- este fixture llegara por error a un entorno público, el error se vería en la
-- primera pantalla en lugar de pasar por verdadero.
--
-- Para qué existe: verificar que la suma del detalle coincide con los totales
-- (SC-007), que las cifras se ven bien en 360 px con números largos, y que el
-- libro de gastos aguanta con veinte filas.

begin;

-- Idempotente: se puede volver a correr sobre una base que ya lo tiene.
delete from public.update_media;
delete from public.updates;
delete from public.expense_receipts;
delete from public.expenses;
delete from public.contributions;
delete from public.milestones;
delete from public.budget_items;
delete from public.payment_methods;
delete from public.media;
delete from public.campaigns where slug = 'casa-de-norma-desarrollo';

-- ── Campaña ─────────────────────────────────────────────────────────────────

insert into public.campaigns
  (id, slug, title, summary, goal_amount_minor, goal_currency, status, reconciled_at, published_at)
values (
  'aaaaaaaa-0000-4000-8000-000000000001',
  'casa-de-norma-desarrollo',
  'Reconstrucción de la casa (datos de desarrollo)',
  'Campaña de prueba del entorno local. Ninguna cifra de esta fila es real.',
  4800000000, -- $ 48.000.000
  'ARS',
  'active',
  now() - interval '4 days',
  now() - interval '40 days'
);

-- ── Rubros del presupuesto ──────────────────────────────────────────────────
-- El último queda sin cotizar a propósito: es el caso que la interfaz tiene que
-- mostrar sin monto en lugar de con un cero.

insert into public.budget_items
  (campaign_id, title, description, estimated_amount_minor, currency, sort_order, published_at)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Techo y estructura',
   'Cabriadas, chapas y aislación del sector que se perdió.', 1850000000, 'ARS', 1, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Mampostería y revoques',
   'Dos paredes exteriores y los revoques interiores.', 1200000000, 'ARS', 2, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Instalación eléctrica',
   'Tablero, cableado y bocas de toda la casa.', 640000000, 'ARS', 3, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Instalación de agua',
   'Cañerías, tanque y baño.', 510000000, 'ARS', 4, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Aberturas',
   'Puertas y ventanas.', 600000000, 'ARS', 5, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Pintura y terminaciones',
   'Queda para el final, cuando el resto esté cerrado.', null, 'ARS', 6, now());

-- ── Hitos ───────────────────────────────────────────────────────────────────

insert into public.milestones
  (campaign_id, title, description, status, happened_on, sort_order, published_at)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Relevamiento de la obra',
   'Se midió la casa y se listó lo que hay que reponer.', 'completado',
   current_date - 35, 1, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Retiro de escombros',
   null, 'completado', current_date - 28, 2, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Compra de materiales del techo',
   'Chapas, cabriadas y tornillería.', 'completado', current_date - 14, 3, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Montaje del techo',
   'Empezó con dos personas del pueblo.', 'en_curso', null, 4, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Paredes exteriores',
   null, 'pendiente', null, 5, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Instalaciones',
   null, 'pendiente', null, 6, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Aberturas y terminaciones',
   null, 'pendiente', null, 7, now());

-- ── Aportes ─────────────────────────────────────────────────────────────────
-- Nunca son públicos individualmente: existen para que los totales tengan algo
-- que sumar. Uno está anulado, para verificar que no cuenta.

insert into public.contributions
  (campaign_id, amount_minor, currency, received_at, is_anonymous, voided_at, void_reason)
select
  'aaaaaaaa-0000-4000-8000-000000000001',
  amount,
  'ARS',
  current_date - dias,
  true,
  null,
  null
from (values
  (150000000, 38), (80000000, 37), (250000000, 36), (45000000, 34),
  (500000000, 33), (120000000, 31), (75000000, 29), (300000000, 27),
  (60000000, 25), (95000000, 22), (200000000, 20), (110000000, 18),
  (40000000, 15), (180000000, 12), (65000000, 9), (90000000, 6),
  (130000000, 3), (55000000, 1)
) as t(amount, dias);

insert into public.contributions
  (campaign_id, amount_minor, currency, received_at, voided_at, void_reason)
values (
  'aaaaaaaa-0000-4000-8000-000000000001', 999000000, 'ARS', current_date - 10,
  now() - interval '9 days', 'Cargado dos veces por error de conciliación.'
);

-- Un aporte en dólares: la interfaz tiene que informarlo aparte, sin convertir.
insert into public.contributions
  (campaign_id, amount_minor, currency, received_at)
values ('aaaaaaaa-0000-4000-8000-000000000001', 40000, 'USD', current_date - 21);

-- ── Gastos ──────────────────────────────────────────────────────────────────

insert into public.expenses
  (id, campaign_id, amount_minor, currency, spent_at, concept, category, supplier, published_at)
values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   38000000, 'ARS', current_date - 30, 'Alquiler de contenedor para escombros',
   'servicios', 'Cooperativa de servicios de Riacho He Hé', now()),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001',
   22000000, 'ARS', current_date - 29, 'Flete de escombros',
   'transporte', null, now()),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001',
   840000000, 'ARS', current_date - 16, 'Chapas acanaladas y tornillería',
   'materiales', 'Corralón San Miguel', now()),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001',
   410000000, 'ARS', current_date - 15, 'Cabriadas metálicas',
   'materiales', 'Herrería Britos', now()),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001',
   96000000, 'ARS', current_date - 12, 'Aislación térmica del techo',
   'materiales', 'Corralón San Miguel', now()),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001',
   180000000, 'ARS', current_date - 8, 'Jornales de montaje del techo, primera semana',
   'mano_de_obra', null, now()),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000001',
   34000000, 'ARS', current_date - 7, 'Amoladora y discos de corte',
   'herramientas', 'Ferretería del centro', now()),
  ('bbbbbbbb-0000-4000-8000-000000000008', 'aaaaaaaa-0000-4000-8000-000000000001',
   12500000, 'ARS', current_date - 5, 'Traslado de materiales desde Formosa',
   'transporte', null, now()),
  ('bbbbbbbb-0000-4000-8000-000000000009', 'aaaaaaaa-0000-4000-8000-000000000001',
   175000000, 'ARS', current_date - 3, 'Jornales de montaje del techo, segunda semana',
   'mano_de_obra', null, now()),
  ('bbbbbbbb-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-000000000001',
   8900000, 'ARS', current_date - 2, 'Tirafondos y selladores',
   'otros', 'Ferretería del centro', now());

-- Un gasto anulado y uno sin publicar: ninguno de los dos puede aparecer en la
-- página pública ni sumar en los totales.
insert into public.expenses
  (campaign_id, amount_minor, currency, spent_at, concept, category, published_at,
   voided_at, void_reason)
values (
  'aaaaaaaa-0000-4000-8000-000000000001', 500000000, 'ARS', current_date - 20,
  'Compra duplicada de chapas', 'materiales', now(),
  now() - interval '19 days', 'Se cargó dos veces la misma factura.'
);

insert into public.expenses
  (campaign_id, amount_minor, currency, spent_at, concept, category, published_at)
values (
  'aaaaaaaa-0000-4000-8000-000000000001', 60000000, 'ARS', current_date,
  'Cemento (pendiente de revisar el comprobante)', 'materiales', null
);

-- ── Comprobantes ────────────────────────────────────────────────────────────
-- El público sabe que existen; el archivo no se publica nunca.

insert into public.expense_receipts
  (expense_id, storage_path, file_name, mime_type, size_bytes)
values
  ('bbbbbbbb-0000-4000-8000-000000000003',
   'comprobantes/desarrollo/factura-chapas.pdf', 'factura-chapas.pdf',
   'application/pdf', 148231),
  ('bbbbbbbb-0000-4000-8000-000000000004',
   'comprobantes/desarrollo/factura-cabriadas.pdf', 'factura-cabriadas.pdf',
   'application/pdf', 121004),
  ('bbbbbbbb-0000-4000-8000-000000000001',
   'comprobantes/desarrollo/recibo-contenedor.jpg', 'recibo-contenedor.jpg',
   'image/jpeg', 402118);

-- ── Métodos de aporte ───────────────────────────────────────────────────────
-- Cada valor dice que es de prueba. La restricción
-- `payment_methods_no_placeholder` impide poner un marcador de relleno, y un CBU
-- con forma de CBU sería peor: acá lo que se necesita es que grite.

insert into public.payment_methods
  (campaign_id, kind, country_code, currency, label, fields, instructions, sort_order, published_at)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'bank_transfer', 'AR', 'ARS',
   'Transferencia en Argentina',
   '[
      {"label": "CBU", "value": "CUENTA DE PRUEBA — NO TRANSFERIR", "copyable": true, "hint": null},
      {"label": "Alias", "value": "CUENTA.DE.PRUEBA", "copyable": true, "hint": "Datos de desarrollo"},
      {"label": "Titular", "value": "Entorno de desarrollo", "copyable": false, "hint": null}
    ]'::jsonb,
   'Datos de desarrollo. No corresponden a ninguna cuenta real.', 1, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'bank_transfer', 'CL', 'CLP',
   'Transferencia en Chile',
   '[
      {"label": "Cuenta", "value": "CUENTA DE PRUEBA — NO TRANSFERIR", "copyable": true, "hint": null},
      {"label": "Banco", "value": "Entorno de desarrollo", "copyable": false, "hint": null}
    ]'::jsonb,
   'Datos de desarrollo. No corresponden a ninguna cuenta real.', 2, now()),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'bank_transfer', 'US', 'USD',
   'Transferencia en Estados Unidos',
   '[
      {"label": "Account number", "value": "CUENTA DE PRUEBA — NO TRANSFERIR", "copyable": true, "hint": null},
      {"label": "Routing number", "value": "CUENTA DE PRUEBA — NO TRANSFERIR", "copyable": true, "hint": null}
    ]'::jsonb,
   'Datos de desarrollo. No corresponden a ninguna cuenta real.', 3, now());

-- ── Novedades ───────────────────────────────────────────────────────────────
-- La última queda sin publicar: un borrador no tiene camino de lectura pública.

insert into public.updates (campaign_id, slug, title, body, published_at)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'empezo-el-techo',
   'Empezó el montaje del techo',
   E'Esta semana llegaron las chapas y las cabriadas, y dos vecinos empezaron el montaje.\n\nEl presupuesto del rubro techo está publicado en la página de la reconstrucción, y las dos facturas ya están cargadas.',
   now() - interval '8 days'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'se-retiraron-los-escombros',
   'Se retiraron los escombros',
   E'Con el contenedor alquilado se sacó todo lo que había quedado.\n\nEl terreno quedó libre para empezar a levantar.',
   now() - interval '28 days'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'borrador-de-prueba',
   'Borrador que no tiene que aparecer',
   'Si esta novedad se ve en la página pública, hay un error en las policies.',
   null);

commit;
