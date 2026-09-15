-- Catálogo de una casa de 60 m² para una persona que vive sola.
--
-- Producción: campaña `casa-de-norma`. Idempotente por título. Sin montos
-- (estimated_unit_amount_minor y currency: promedios de internet citados en
-- docs/research/2026-09-precios-catalogo.md. Sin fuente, nulo: ADR-044).
-- Publicado de entrada: `published_at = now()`.
--
-- Cada ítem sale **sin foto en Storage**. El listado y la ficha pública
-- muestran la foto de referencia del título (public/fotos/catalogo/, ADR-043)
-- hasta que el equipo suba la foto real desde `/admin/catalogo`. Esa, si
-- existe, gana. En el listado va compacta en Qué; el epígrafe vive en la ficha.
--
-- No corre en el fixture local: ese entorno tiene su propio ítem de prueba.
--
-- ── Cálculo de mampostería y obra gris ──────────────────────────────────────
-- Casa de 60 m², planta 6 × 10 m, altura de muro 2,60 m.
-- Perímetro 32 m → muros exteriores brutos 83 m². Vanos ~10 m² → netos 73 m².
-- Tabiques interiores ~50 m². Superficie de muro a cubrir ~123 m².
--
-- Ladrillo común a soga (12 cm): 60 u/m² (Red Materiales / corralones AR).
-- 3000 comunes ÷ 60 = 50 m² de muro. Es el número pedido para simples.
--
-- Ladrillo hueco 18×18×33: 15 u/m² (cara 18×33, junta ~1,5 cm).
-- Equivalente de esos 50 m²: 50 × 15 = 750. +8 % de rotura → 800 huecos.
-- Si la obra va en hueco, estos 800 cubren la misma superficie que los 3000
-- comunes. Quedan los dos cargados para que se pueda elegir sistema.
--
-- Cal, cemento y arena de la casa de 60 m² (no sólo de esos 50 m² de muro):
-- contrapiso 10 cm 60 m² (APU Colegio de Arquitectos de Salta: 23,4 kg
-- cemento/m², 0,05 m³ arena/m², 0,08 m³ ripio/m²) + carpeta + revoque
-- exterior 73 m² e interior ~173 m² (0,03 m³ arena, 3,10 kg cal, 1,70–4,85 kg
-- cemento por m²) + asiento de mampostería. Con 10 % de desperdicio, redondeado:
--   cemento 55 bolsas de 50 kg
--   cal hidratada 40 bolsas de 25 kg
--   arena 13 m³
--   ripio 5 m³ (el contrapiso lo pide; sin ripio no hay piso)

do $$
begin
  if not exists (select 1 from public.campaigns where slug = 'casa-de-norma') then
    raise exception
      'No hay campaña casa-de-norma. Creala antes de cargar el catálogo (docs/runbook.md).';
  end if;
end $$;

drop table if exists catalog_seed;
create temp table catalog_seed (
  sort_order integer not null,
  category public.donation_item_category not null,
  title text not null,
  description text not null,
  unit public.donation_unit not null,
  needed_quantity integer not null,
  estimated_unit_pesos integer,
  check (estimated_unit_pesos is null or estimated_unit_pesos > 0)
);

insert into catalog_seed (
  sort_order, category, title, description, unit, needed_quantity
) values
  -- Materiales
  (10, 'materiales', 'Ladrillos comunes',
   '3.000 ladrillos simples (comunes) a soga. A 60 u/m² cubren unos 50 m² de muro de 12 cm. Es el cálculo pedido para esta casa.',
   'unidad', 3000),
  (20, 'materiales', 'Ladrillos huecos 18x18x33',
   '800 huecos de 18×18×33. Equivalente de esos 3.000 comunes: 15 u/m² cubren los mismos 50 m², con 8 % de rotura. Si la obra va en hueco, con estos alcanza para esa superficie.',
   'unidad', 800),
  (30, 'materiales', 'Cemento',
   '55 bolsas de 50 kg para una casa de 60 m²: contrapiso, carpeta, revoques y asiento de ladrillo. No es un precio; es el cómputo de bolsas.',
   'bolsa', 55),
  (40, 'materiales', 'Cal hidratada',
   '40 bolsas de 25 kg. Va en revoques y en el mortero de asiento. Dosificación de obra húmeda argentina.',
   'bolsa', 40),
  (50, 'materiales', 'Arena',
   '13 m³ de arena mediana lavada: contrapiso, revoques y mampostería de 60 m².',
   'metro_cubico', 13),
  (60, 'materiales', 'Ripio',
   '5 m³ para el contrapiso de 10 cm de 60 m². Sin esto no hay piso.',
   'metro_cubico', 5),
  (70, 'materiales', 'Hidrófugo',
   '10 litros para el revoque exterior. El agua de lluvia no puede pasar al ladrillo.',
   'litro', 10),
  (80, 'materiales', 'Chapas de techo',
   '70 m² de chapa. La casa tiene 60 m² cubiertos; el resto es recubrimiento y pendiente.',
   'metro_cuadrado', 70),
  (90, 'materiales', 'Cerámico de piso',
   '70 m² de cerámico. 60 m² de planta más recortes y desperdicio.',
   'metro_cuadrado', 70),
  (95, 'materiales', 'Azulejos de cocina',
   '8 m² de revestimiento para la mesada y la pared de la pileta. Cocina desde cero.',
   'metro_cuadrado', 8),
  (96, 'materiales', 'Azulejos de baño',
   '18 m² para las paredes del baño. Tina, inodoro y lavatorio no van sobre ladrillo a la vista.',
   'metro_cuadrado', 18),
  (100, 'materiales', 'Pintura',
   '40 litros, látex interior y exterior. Dos manos sobre muros y cielorraso de 60 m².',
   'litro', 40),
  (102, 'materiales', 'Hierro para estructura',
   'Quince atados de hierro para columnas, vigas y dinteles de una casa de 60 m². Sin esto no hay losa ni vanos.',
   'unidad', 15),
  (104, 'materiales', 'Tirantes de techo',
   'Veinte tirantes o cabriadas para el techo de chapas. La chapa no se clava al aire.',
   'unidad', 20),
  (106, 'materiales', 'Cielorraso',
   '70 m² de cielorraso. Debajo de la chapa, para el calor de Formosa.',
   'metro_cuadrado', 70),
  (108, 'materiales', 'Zócalos',
   '40 metros de zócalo para el perímetro interior de 60 m².',
   'metro', 40),
  (109, 'materiales', 'Enduido',
   'Diez bolsas para emparejar muros antes de pintar.',
   'bolsa', 10),
  (107, 'materiales', 'Clavos y alambre',
   'Clavos, alambre de atar y tornillos para techo, rejas y aberturas. Un juego de obra.',
   'juego', 1),

  -- Aberturas
  (110, 'aberturas', 'Puerta de entrada',
   'Una puerta de entrada, con marco y cerradura. Sin esto la casa no cierra.',
   'unidad', 1),
  (120, 'aberturas', 'Puertas interiores',
   'Tres puertas: dormitorio, baño y el vano que separe la cocina.',
   'unidad', 3),
  (130, 'aberturas', 'Ventanas',
   'Cuatro ventanas. Luz y aire en Formosa no son un lujo.',
   'unidad', 4),
  (140, 'aberturas', 'Rejas',
   'Rejas para las cuatro ventanas. En el pueblo se cierran de noche.',
   'unidad', 4),
  (150, 'aberturas', 'Portón',
   'Un portón para el frente. La casa no queda abierta a la calle.',
   'unidad', 1),

  -- Instalaciones
  (200, 'instalaciones', 'Tanque de agua',
   'Un tanque de 500 litros o el que entre en la losa. Sin reserva no hay agua cuando baja la presión.',
   'unidad', 1),
  (205, 'instalaciones', 'Bomba de agua',
   'Una bomba para subir el agua al tanque. Sin esto el tanque no se llena solo.',
   'unidad', 1),
  (208, 'instalaciones', 'Cámara séptica',
   'Cámara séptica o pozo homologado. El baño no desagua a la calle.',
   'unidad', 1),
  (210, 'instalaciones', 'Inodoro',
   'Inodoro con depósito. El baño no está armado sin esto.',
   'unidad', 1),
  (215, 'instalaciones', 'Bidet',
   'Un bidet. En una casa argentina el baño se arma con esto.',
   'unidad', 1),
  (218, 'instalaciones', 'Tina',
   'Una tina. El baño se construye desde cero: no hay bañera.',
   'unidad', 1),
  (219, 'instalaciones', 'Receptáculo de ducha',
   'Box o receptáculo de ducha, si la obra no pone tina. Quedan los dos para elegir sistema.',
   'unidad', 1),
  (220, 'instalaciones', 'Lavatorio',
   'Un lavatorio con pie o de colgar, para el baño.',
   'unidad', 1),
  (225, 'instalaciones', 'Vanitory',
   'Mueble de vanitory bajo el lavatorio. El jabón y las toallas no van al piso.',
   'unidad', 1),
  (230, 'instalaciones', 'Pileta de cocina',
   'Pileta simple de acero o loza, con escurridor.',
   'unidad', 1),
  (232, 'instalaciones', 'Mesada de cocina',
   'Dos metros de mesada. La pileta y la cocina no se apoyan en una tabla.',
   'metro', 2),
  (240, 'instalaciones', 'Grifería de baño',
   'Grifería de ducha, de tina y de lavatorio. Un juego que cierre bien.',
   'juego', 1),
  (245, 'instalaciones', 'Grifería de cocina',
   'Grifería de pileta de cocina. No es la misma que la del baño.',
   'juego', 1),
  (248, 'instalaciones', 'Mampara',
   'Mampara o cortina rígida para la ducha o la tina, para que el agua no inunde el piso.',
   'unidad', 1),
  (249, 'instalaciones', 'Extractor de baño',
   'Extractor o ventiluz. Un baño sin aire se pudre.',
   'unidad', 1),
  (250, 'instalaciones', 'Caños de agua',
   '40 metros de caño de agua (termofusión o el que use la obra) para cocina y baño.',
   'metro', 40),
  (260, 'instalaciones', 'Caños de desagüe',
   '20 metros de desagüe cloacal y de pileta.',
   'metro', 20),
  (265, 'instalaciones', 'Caños de gas',
   '15 metros de caño de gas para cocina y calefón, o la traza que use la obra.',
   'metro', 15),
  (268, 'instalaciones', 'Garrafa y regulador',
   'Garrafa y regulador, si la cocina va a gas envasado. Sin esto no hay fuego.',
   'juego', 1),
  (270, 'instalaciones', 'Cable eléctrico',
   '100 metros de cable para luces y tomas de una casa de 60 m².',
   'metro', 100),
  (280, 'instalaciones', 'Llaves y tomacorrientes',
   'Veinte: luces, heladera, lavarropas, ventiladores, cocina.',
   'unidad', 20),
  (290, 'instalaciones', 'Tablero eléctrico',
   'Un tablero chico con termomagnéticas. No se conecta una casa directo al medidor.',
   'unidad', 1),
  (295, 'instalaciones', 'Accesorios de baño',
   'Toallero, portarrollos y jabonera. El baño se usa todos los días.',
   'juego', 1),

  -- Electrodomésticos
  (300, 'electrodomesticos', 'Cocina',
   'Anafe con horno, a gas o eléctrico, para cocinar todos los días.',
   'unidad', 1),
  (310, 'electrodomesticos', 'Heladera',
   'Heladera con freezer chico. Formosa es calor: sin esto no se guarda comida.',
   'unidad', 1),
  (320, 'electrodomesticos', 'Lavarropas',
   'Uno, aunque sea semiautomático. Lavar a mano todo el tiempo no es una casa armada.',
   'unidad', 1),
  (330, 'electrodomesticos', 'Ventiladores',
   'Dos ventiladores de pie o de techo. El calor de Formosa no es un detalle.',
   'unidad', 2),
  (340, 'electrodomesticos', 'Calefón o termotanque',
   'Agua caliente para bañarse. En invierno el agua de red sale fría.',
   'unidad', 1),
  (350, 'electrodomesticos', 'Plancha',
   'Una plancha chica.',
   'unidad', 1),
  (360, 'electrodomesticos', 'Microondas',
   'Un microondas. Calentar sin prender el horno, en el calor de Formosa.',
   'unidad', 1),
  (370, 'electrodomesticos', 'Pava eléctrica',
   'Una pava eléctrica. El agua para mate y para cocinar no se espera en una cacerola.',
   'unidad', 1),
  (380, 'electrodomesticos', 'Campana extractora',
   'Campana o extractor sobre la cocina. El humo no se queda en la casa.',
   'unidad', 1),

  -- Muebles
  (400, 'muebles', 'Cama plaza y media',
   'Estructura de cama plaza y media. Sin esto no hay dónde dormir.',
   'unidad', 1),
  (410, 'muebles', 'Colchón plaza y media',
   'Colchón plaza y media. La cama sola no alcanza.',
   'unidad', 1),
  (420, 'muebles', 'Ropero',
   'Un ropero o placard chico para la ropa. Sin esto queda en bolsas.',
   'unidad', 1),
  (430, 'muebles', 'Mesa de luz',
   'Una mesa de luz al lado de la cama. El teléfono y un vaso no van al piso.',
   'unidad', 1),
  (440, 'muebles', 'Mesa de cocina',
   'Una mesa para una persona, con lugar para que se siente alguien más.',
   'unidad', 1),
  (450, 'muebles', 'Sillas',
   'Dos sillas: una para quien vive ahí y otra para una visita.',
   'unidad', 2),
  (460, 'muebles', 'Sillón de dos cuerpos',
   'Un lugar para sentarse que no sea la cama ni una silla de cocina.',
   'unidad', 1),
  (470, 'muebles', 'Mesa ratona',
   'Una mesa baja para un vaso, un plato, las llaves.',
   'unidad', 1),
  (480, 'muebles', 'Bajo mesada',
   'Mueble bajo mesada para ollas y el tacho. La cocina se arma desde cero.',
   'unidad', 1),
  (490, 'muebles', 'Alacena',
   'Una alacena para platos y comida seca. Sin esto queda en cajas.',
   'unidad', 1),
  (495, 'muebles', 'Banqueta de cocina',
   'Una banqueta o taburete para la mesada, además de las sillas de la mesa.',
   'unidad', 1),

  -- Ajuar
  (500, 'ajuar', 'Juego de ollas',
   'Ollas de distintos tamaños para agua, guiso y arroz.',
   'juego', 1),
  (510, 'ajuar', 'Sartenes',
   'Dos sartenes: una chica y una más grande.',
   'unidad', 2),
  (520, 'ajuar', 'Vajilla',
   'Platos playos, hondos y tazas para una persona, con un juego de más.',
   'juego', 1),
  (530, 'ajuar', 'Cubiertos',
   'Cuchillos, tenedores y cucharas para el día a día.',
   'juego', 1),
  (540, 'ajuar', 'Vasos y jarra',
   'Vasos y una jarra para agua. En el calor se toma todo el tiempo.',
   'juego', 1),
  (550, 'ajuar', 'Utensilios de cocina',
   'Cuchillo de cocina, cuchara de palo, colador, abrelatas.',
   'juego', 1),
  (560, 'ajuar', 'Tabla para picar',
   'Una tabla de cocina, no la mesada.',
   'unidad', 1),
  (570, 'ajuar', 'Almohadas',
   'Dos almohadas. Una se lava, la otra se usa.',
   'unidad', 2),
  (580, 'ajuar', 'Sábanas plaza y media',
   'Dos juegos: uno en la cama y otro en el tender.',
   'juego', 2),
  (590, 'ajuar', 'Acolchado',
   'Un acolchado o frazada liviana. De noche baja la temperatura.',
   'unidad', 1),
  (600, 'ajuar', 'Toallas',
   'Toallas de baño. Alcanzan para rotar mientras se secan.',
   'unidad', 4),
  (610, 'ajuar', 'Cortina de baño',
   'Cortina para que el agua no inunde el piso.',
   'unidad', 1),
  (620, 'ajuar', 'Espejo de baño',
   'Un espejo chico sobre la pileta.',
   'unidad', 1),
  (630, 'ajuar', 'Cortinas',
   'Cortinas para las ventanas: sombra de día, privacidad de noche.',
   'juego', 1),
  (640, 'ajuar', 'Tender',
   'Tender para secar la ropa. Al sol, afuera.',
   'unidad', 1),
  (650, 'ajuar', 'Balde y lampazo',
   'Balde, palangana y lampazo para el piso y la ropa a mano.',
   'juego', 1),
  (660, 'ajuar', 'Escoba y palita',
   'Escoba, palita y tacho de basura de cocina.',
   'juego', 1),
  (670, 'ajuar', 'Lámparas',
   'Focos para las habitaciones. Una casa a oscuras no se usa de noche.',
   'unidad', 6),
  (680, 'ajuar', 'Zapatillas eléctricas',
   'Dos zapatillas para heladera, ventilador, celular, lamparita.',
   'unidad', 2),
  (690, 'ajuar', 'Perchas',
   'Perchas para el ropero. Sin esto la ropa se apila.',
   'juego', 1);

update catalog_seed as s
set estimated_unit_pesos = v.pesos
from (values
  ('Ladrillos comunes', 145),
  ('Ladrillos huecos 18x18x33', 480),
  ('Cemento', 11858),
  ('Cal hidratada', 3500),
  ('Arena', 46585),
  ('Ripio', 90145),
  ('Hidrófugo', 2600),
  ('Chapas de techo', 18000),
  ('Cerámico de piso', 15730),
  ('Azulejos de cocina', 15730),
  ('Azulejos de baño', 15730),
  ('Pintura', 6595),
  ('Tirantes de techo', 26460),
  ('Cielorraso', 5588),
  ('Zócalos', 1101),
  ('Enduido', 55418),
  ('Cable eléctrico', 938),
  ('Caños de agua', 5264),
  ('Caños de desagüe', 7034),
  ('Caños de gas', 6790),
  ('Puerta de entrada', 425373),
  ('Puertas interiores', 505220),
  ('Ventanas', 386691),
  ('Rejas', 185695),
  ('Portón', 405490),
  ('Tanque de agua', 140000),
  ('Bomba de agua', 207561),
  ('Cámara séptica', 335639),
  ('Inodoro', 250439),
  ('Bidet', 152356),
  ('Tina', 366454),
  ('Receptáculo de ducha', 120825),
  ('Lavatorio', 62672),
  ('Vanitory', 78806),
  ('Pileta de cocina', 146940),
  ('Mesada de cocina', 207787),
  ('Grifería de baño', 226650),
  ('Grifería de cocina', 39748),
  ('Mampara', 224469),
  ('Extractor de baño', 40003),
  ('Garrafa y regulador', 45119),
  ('Llaves y tomacorrientes', 2329),
  ('Tablero eléctrico', 77283),
  ('Accesorios de baño', 72881),
  ('Cocina', 510000),
  ('Heladera', 834950),
  ('Lavarropas', 620000),
  ('Ventiladores', 149900),
  ('Calefón o termotanque', 475000),
  ('Plancha', 24000),
  ('Microondas', 169199),
  ('Pava eléctrica', 53810),
  ('Campana extractora', 290800),
  ('Cama plaza y media', 220000),
  ('Colchón plaza y media', 287140),
  ('Ropero', 110000),
  ('Mesa de luz', 40999),
  ('Mesa de cocina', 59900),
  ('Sillas', 60000),
  ('Sillón de dos cuerpos', 502346),
  ('Mesa ratona', 49999),
  ('Banqueta de cocina', 61200),
  ('Bajo mesada', 88125),
  ('Alacena', 93132),
  ('Juego de ollas', 135542),
  ('Sartenes', 29050),
  ('Vajilla', 18075),
  ('Cubiertos', 26833),
  ('Utensilios de cocina', 10999),
  ('Tabla para picar', 13477),
  ('Almohadas', 17535),
  ('Sábanas plaza y media', 38746),
  ('Acolchado', 68650),
  ('Toallas', 16259),
  ('Cortina de baño', 5950),
  ('Espejo de baño', 12499),
  ('Tender', 50924),
  ('Balde y lampazo', 42350),
  ('Zapatillas eléctricas', 16147),
  ('Perchas', 60649)
) as v(title, pesos)
where s.title = v.title;

insert into public.donation_items (
  campaign_id, title, description, unit, category, needed_quantity, sort_order,
  estimated_unit_amount_minor, currency, published_at
)
select
  c.id,
  i.title,
  i.description,
  i.unit,
  i.category,
  i.needed_quantity,
  i.sort_order,
  i.estimated_unit_pesos * 100,
  case when i.estimated_unit_pesos is null then null else 'ARS' end,
  now()
from public.campaigns c
cross join catalog_seed i
where c.slug = 'casa-de-norma'
  and not exists (
    select 1
      from public.donation_items d
     where d.campaign_id = c.id
       and d.title = i.title
  );

update public.donation_items d
set
  category = i.category,
  description = i.description,
  unit = i.unit,
  needed_quantity = greatest(i.needed_quantity, d.reserved_quantity + d.fulfilled_quantity),
  sort_order = i.sort_order,
  estimated_unit_amount_minor = i.estimated_unit_pesos * 100,
  currency = case when i.estimated_unit_pesos is null then null else 'ARS' end
from catalog_seed i
join public.campaigns c on c.slug = 'casa-de-norma'
where d.campaign_id = c.id
  and d.title = i.title;

select
  category,
  title,
  unit,
  needed_quantity,
  sort_order,
  published_at is not null as publicado
from public.donation_items
where campaign_id = (select id from public.campaigns where slug = 'casa-de-norma')
order by sort_order;
