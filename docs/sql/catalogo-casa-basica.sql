-- Catálogo básico de una casa para una persona que vive sola.
--
-- Producción: campaña `casa-de-norma`. Idempotente por título. Sin montos
-- (estimated_unit_amount_minor y currency quedan nulos: D3 / ADR-031 / ADR-040).
-- Publicado de entrada: `published_at = now()`.
--
-- Cada ítem sin foto reserva un hueco en `/catalogo`. Cuando haya foto, se
-- carga desde `/admin/catalogo`; no se inventa una ilustración.
--
-- No corre en el fixture local: ese entorno tiene su propio ítem de prueba.

do $$
begin
  if not exists (select 1 from public.campaigns where slug = 'casa-de-norma') then
    raise exception
      'No hay campaña casa-de-norma. Creala antes de cargar el catálogo (docs/runbook.md).';
  end if;
end $$;

with items (
  sort_order, title, description, unit, needed_quantity
) as (
  values
    -- Cocina
    (10, 'Cocina',
     'Anafe con horno, a gas o eléctrico, para cocinar todos los días.',
     'unidad'::public.donation_unit, 1),
    (20, 'Heladera',
     'Heladera con freezer chico. Formosa es calor: sin esto no se guarda comida.',
     'unidad'::public.donation_unit, 1),
    (30, 'Mesa de cocina',
     'Una mesa para una persona, con lugar para que se siente alguien más.',
     'unidad'::public.donation_unit, 1),
    (40, 'Sillas',
     'Dos sillas: una para quien vive ahí y otra para una visita.',
     'unidad'::public.donation_unit, 2),
    (50, 'Juego de ollas',
     'Ollas de distintos tamaños para agua, guiso y arroz.',
     'juego'::public.donation_unit, 1),
    (60, 'Sartenes',
     'Dos sartenes: una chica y una más grande.',
     'unidad'::public.donation_unit, 2),
    (70, 'Vajilla',
     'Platos playos, hondos y tazas para una persona, con un juego de más.',
     'juego'::public.donation_unit, 1),
    (80, 'Cubiertos',
     'Cuchillos, tenedores y cucharas para el día a día.',
     'juego'::public.donation_unit, 1),
    (90, 'Vasos y jarra',
     'Vasos y una jarra para agua. En el calor se toma todo el tiempo.',
     'juego'::public.donation_unit, 1),
    (100, 'Utensilios de cocina',
     'Cuchillo de cocina, cuchara de palo, colador, abrelatas.',
     'juego'::public.donation_unit, 1),
    (110, 'Tabla para picar',
     'Una tabla de cocina, no la mesada.',
     'unidad'::public.donation_unit, 1),

    -- Dormitorio
    (120, 'Cama plaza y media',
     'Estructura de cama plaza y media. Sin esto no hay dónde dormir.',
     'unidad'::public.donation_unit, 1),
    (130, 'Colchón plaza y media',
     'Colchón plaza y media. La cama sola no alcanza.',
     'unidad'::public.donation_unit, 1),
    (140, 'Almohadas',
     'Dos almohadas. Una se lava, la otra se usa.',
     'unidad'::public.donation_unit, 2),
    (150, 'Sábanas plaza y media',
     'Dos juegos: uno en la cama y otro en el tender.',
     'juego'::public.donation_unit, 2),
    (160, 'Acolchado',
     'Un acolchado o frazada liviana. De noche baja la temperatura.',
     'unidad'::public.donation_unit, 1),
    (170, 'Ropero',
     'Un ropero o placard chico para la ropa. Sin esto queda en bolsas.',
     'unidad'::public.donation_unit, 1),

    -- Baño
    (180, 'Calefón o termotanque',
     'Agua caliente para bañarse. En invierno el agua de red sale fría.',
     'unidad'::public.donation_unit, 1),
    (190, 'Toallas',
     'Toallas de baño. Alcanzan para rotar mientras se secan.',
     'unidad'::public.donation_unit, 4),
    (200, 'Cortina de baño',
     'Cortina para que el agua no inunde el piso.',
     'unidad'::public.donation_unit, 1),
    (210, 'Espejo de baño',
     'Un espejo chico sobre la pileta.',
     'unidad'::public.donation_unit, 1),

    -- Estar
    (220, 'Sillón de dos cuerpos',
     'Un lugar para sentarse que no sea la cama ni una silla de cocina.',
     'unidad'::public.donation_unit, 1),
    (230, 'Mesa ratona',
     'Una mesa baja para un vaso, un plato, las llaves.',
     'unidad'::public.donation_unit, 1),
    (240, 'Cortinas',
     'Cortinas para las ventanas: sombra de día, privacidad de noche.',
     'juego'::public.donation_unit, 1),

    -- Clima (Formosa)
    (250, 'Ventiladores',
     'Dos ventiladores de pie o de techo. El calor de Formosa no es un detalle.',
     'unidad'::public.donation_unit, 2),

    -- Lavado y limpieza
    (260, 'Lavarropas',
     'Uno, aunque sea semiautomático. Lavar a mano todo el tiempo no es una casa armada.',
     'unidad'::public.donation_unit, 1),
    (270, 'Tender',
     'Tender para secar la ropa. Al sol, afuera.',
     'unidad'::public.donation_unit, 1),
    (280, 'Balde y lampazo',
     'Balde, palangana y lampazo para el piso y la ropa a mano.',
     'juego'::public.donation_unit, 1),
    (290, 'Escoba y palita',
     'Escoba, palita y tacho de basura de cocina.',
     'juego'::public.donation_unit, 1),

    -- Luz y corriente
    (300, 'Lámparas',
     'Focos para las habitaciones. Una casa a oscuras no se usa de noche.',
     'unidad'::public.donation_unit, 6),
    (310, 'Zapatillas eléctricas',
     'Dos zapatillas para heladera, ventilador, celular, lamparita.',
     'unidad'::public.donation_unit, 2),

    -- Ropa y arreglo
    (320, 'Plancha',
     'Una plancha chica.',
     'unidad'::public.donation_unit, 1),
    (330, 'Perchas',
     'Perchas para el ropero. Sin esto la ropa se apila.',
     'juego'::public.donation_unit, 1)
)
insert into public.donation_items (
  campaign_id, title, description, unit, needed_quantity, sort_order, published_at
)
select
  c.id,
  i.title,
  i.description,
  i.unit,
  i.needed_quantity,
  i.sort_order,
  now()
from public.campaigns c
cross join items i
where c.slug = 'casa-de-norma'
  and not exists (
    select 1
      from public.donation_items d
     where d.campaign_id = c.id
       and d.title = i.title
  );

select title, unit, needed_quantity, sort_order, published_at is not null as publicado
  from public.donation_items
 where campaign_id = (select id from public.campaigns where slug = 'casa-de-norma')
 order by sort_order;
