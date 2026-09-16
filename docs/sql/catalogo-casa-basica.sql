-- Catálogo de la reconstrucción de la casa de Norma.
--
-- Casa de ~102,5 m²: 2 dormitorios + living + comedor + cocina + 2 baños +
-- lavadero. Materiales principales sobredimensionados al menos 10 %.
-- Campaña `casa-de-norma`. Idempotente por título.
--
-- Estimados: lista de cómputo de reconstrucción cargada por la dueña de la
-- campaña (septiembre 2026). No son un promedio de internet ni una cotización
-- de corralón. Fuente citada en docs/research/2026-09-precios-catalogo.md.
-- En la base: pesos × 100 (centavos) y currency ARS. Publicado de entrada:
-- `published_at = now()` en el insert de títulos nuevos.
--
-- Cada ítem sale **sin foto en Storage**. El listado y la ficha pública
-- muestran la foto de referencia del título (public/fotos/catalogo/, ADR-043)
-- hasta que el equipo suba la foto real desde `/admin/catalogo`. Esa, si
-- existe, gana. En el listado va compacta en Qué; el epígrafe vive en la ficha.
--
-- No borra filas: donation_pledges.item_id es ON DELETE RESTRICT y nada
-- financiero se borra. Inserta títulos que faltan, actualiza los que coinciden
-- (needed no baja de reserved+fulfilled) y despublica los títulos que ya no
-- están en este seed.
--
-- No corre en el fixture local: ese entorno tiene su propio ítem de prueba.

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
  needed_quantity integer not null check (needed_quantity > 0),
  estimated_unit_pesos integer not null check (estimated_unit_pesos > 0)
);

insert into catalog_seed
(sort_order, category, title, description, unit, needed_quantity, estimated_unit_pesos)
values
  -- Obra gruesa
  (10, 'materiales', 'Ladrillo hueco cerámico 18x18x33',
   'Mampostería exterior e interior. Cantidad con margen de seguridad.',
   'unidad', 3080, 1200),
  (20, 'materiales', 'Cemento 50 kg',
   'Mampostería, revoques, carpetas, contrapisos y hormigones.',
   'bolsa', 105, 16400),
  (30, 'materiales', 'Cal hidratada 25 kg',
   'Morteros y revoques interiores y exteriores.',
   'bolsa', 72, 7200),
  (40, 'materiales', 'Arena mediana lavada',
   'Mampostería, revoques, carpetas y hormigones.',
   'metro_cubico', 25, 40000),
  (50, 'materiales', 'Ripio / piedra partida',
   'Contrapisos, bases y hormigones.',
   'metro_cubico', 11, 90000),
  (60, 'materiales', 'Hidrófugo',
   'Capa aisladora y revoques hidrófugos.',
   'litro', 33, 5000),
  (70, 'materiales', 'Membrana / barrera hidrófuga',
   'Protección contra humedad y filtraciones.',
   'metro_cuadrado', 35, 8500),
  (80, 'materiales', 'Malla electrosoldada SIMA',
   'Refuerzo de pisos y contrapisos.',
   'unidad', 18, 85000),

  -- Estructura
  (100, 'materiales', 'Hierro ADN 8 mm x 12 m',
   'Estribos y refuerzos. Cantidad preliminar con margen.',
   'unidad', 77, 9500),
  (110, 'materiales', 'Hierro ADN 10 mm x 12 m',
   'Vigas, encadenados y refuerzos.',
   'unidad', 77, 14500),
  (120, 'materiales', 'Hierro ADN 12 mm x 12 m',
   'Columnas y vigas según cálculo estructural.',
   'unidad', 50, 20500),
  (130, 'materiales', 'Alambre de atar',
   'Atado de armaduras.',
   'unidad', 8, 18000),
  (140, 'materiales', 'Madera / fenólico para encofrado',
   'Encofrado para columnas, vigas y dinteles.',
   'juego', 1, 650000),

  -- Techo
  (160, 'materiales', 'Chapa trapezoidal aluminizada calibre 25',
   'Cubierta incluyendo pendiente, solapes, aleros y margen adicional.',
   'metro', 105, 15500),
  (170, 'materiales', 'Estructura de techo / perfiles galvanizados',
   'Perfilería y correas para cubierta.',
   'juego', 1, 2200000),
  (180, 'materiales', 'Aislante térmico aluminizado para techo',
   'Aislación térmica bajo chapa para clima de Formosa.',
   'unidad', 14, 57000),
  (190, 'materiales', 'Tornillos autoperforantes con arandela',
   'Fijación completa de chapas.',
   'juego', 1, 180000),
  (200, 'materiales', 'Cumbreras y babetas',
   'Terminaciones y protección contra filtraciones.',
   'metro', 25, 18000),
  (210, 'materiales', 'Canaletas pluviales',
   'Recolección de agua del techo.',
   'metro', 28, 22000),
  (220, 'materiales', 'Bajadas pluviales',
   'Descarga del agua lejos de fundaciones.',
   'metro', 18, 15000),
  (230, 'materiales', 'Cielorraso',
   'Cielorraso completo con margen adicional.',
   'metro_cuadrado', 125, 9500),

  -- Pisos y terminaciones
  (250, 'materiales', 'Cerámico de piso',
   'Piso de toda la vivienda incluyendo cortes y desperdicio.',
   'metro_cuadrado', 125, 18000),
  (260, 'materiales', 'Adhesivo para cerámicos 30 kg',
   'Colocación de pisos y revestimientos.',
   'bolsa', 39, 16000),
  (270, 'materiales', 'Pastina',
   'Terminación de juntas.',
   'bolsa', 12, 9500),
  (280, 'materiales', 'Revestimiento cerámico baños',
   'Revestimiento para los dos baños.',
   'metro_cuadrado', 47, 20000),
  (290, 'materiales', 'Revestimiento cerámico cocina',
   'Frente de mesada y sector de cocina.',
   'metro_cuadrado', 11, 20000),
  (300, 'materiales', 'Zócalos',
   'Zócalos interiores.',
   'metro', 75, 2500),
  (310, 'materiales', 'Enduido interior',
   'Preparación de paredes.',
   'bolsa', 18, 30000),
  (320, 'materiales', 'Fijador sellador',
   'Preparación previa a pintura.',
   'litro', 30, 5500),
  (330, 'materiales', 'Pintura látex interior',
   'Paredes y cielorrasos.',
   'litro', 80, 7000),
  (340, 'materiales', 'Pintura exterior impermeable',
   'Protección de fachadas.',
   'litro', 40, 9000),
  (350, 'materiales', 'Impermeabilizante para baños y cocina',
   'Impermeabilización debajo de revestimientos.',
   'litro', 20, 12000),

  -- Aberturas
  (400, 'aberturas', 'Puerta principal de aluminio reforzada',
   'Puerta exterior con marco y cerradura.',
   'unidad', 1, 465000),
  (410, 'aberturas', 'Puertas interiores',
   'Dormitorios, dos baños y lavadero.',
   'unidad', 5, 240000),
  (420, 'aberturas', 'Ventanas de aluminio con vidrio',
   'Ventanas para dormitorios y ambientes principales.',
   'unidad', 6, 190000),
  (430, 'aberturas', 'Ventiluces de baño',
   'Uno por baño.',
   'unidad', 2, 90000),
  (440, 'aberturas', 'Mosquiteros',
   'Mosquiteros para las aberturas.',
   'unidad', 8, 45000),
  (450, 'aberturas', 'Rejas de seguridad',
   'Protección de ventanas exteriores.',
   'unidad', 6, 180000),
  (460, 'aberturas', 'Cerraduras y herrajes',
   'Cerraduras, bisagras y picaportes.',
   'juego', 1, 280000),

  -- Agua y desagües
  (500, 'instalaciones', 'Tanque de agua 1000 litros',
   'Reserva de agua de la vivienda.',
   'unidad', 1, 260000),
  (510, 'instalaciones', 'Base y conexiones para tanque',
   'Soporte, flotante, válvulas y conexiones.',
   'juego', 1, 180000),
  (520, 'instalaciones', 'Bomba presurizadora / elevadora',
   'Carga y presión de agua.',
   'unidad', 1, 220000),
  (530, 'instalaciones', 'Caño termofusión agua fría/caliente',
   'Red para cocina, lavadero y dos baños.',
   'metro', 110, 4200),
  (540, 'instalaciones', 'Accesorios termofusión y llaves de paso',
   'Codos, tees, uniones y válvulas.',
   'juego', 1, 320000),
  (550, 'instalaciones', 'Caño PVC cloacal y desagües',
   'Red sanitaria completa.',
   'metro', 61, 7500),
  (560, 'instalaciones', 'Accesorios PVC cloacal',
   'Codos, ramales, reducciones y pegamentos.',
   'juego', 1, 300000),
  (570, 'instalaciones', 'Cámara séptica / biodigestor',
   'Sistema sanitario si no existe red cloacal.',
   'unidad', 1, 650000),
  (580, 'instalaciones', 'Cámaras de inspección',
   'Registro de la instalación sanitaria.',
   'unidad', 3, 95000),

  -- Dos baños
  (590, 'instalaciones', 'Inodoro con mochila',
   'Uno por baño.',
   'unidad', 2, 240000),
  (600, 'instalaciones', 'Bidet',
   'Uno por baño.',
   'unidad', 2, 150000),
  (610, 'instalaciones', 'Vanitory con lavatorio',
   'Uno por baño.',
   'unidad', 2, 180000),
  (620, 'instalaciones', 'Grifería de lavatorio',
   'Una por baño.',
   'unidad', 2, 75000),
  (630, 'instalaciones', 'Ducha completa con grifería',
   'Una ducha completa por baño.',
   'juego', 2, 190000),
  (640, 'instalaciones', 'Mampara de ducha',
   'Una por baño.',
   'unidad', 2, 220000),
  (650, 'instalaciones', 'Extractor de baño',
   'Extracción de humedad.',
   'unidad', 2, 55000),
  (660, 'instalaciones', 'Accesorios de baño',
   'Toalleros, portarrollos y jaboneras.',
   'juego', 2, 65000),

  -- Cocina y lavadero
  (670, 'instalaciones', 'Pileta de cocina acero inoxidable',
   'Bacha con escurridor.',
   'unidad', 1, 150000),
  (680, 'instalaciones', 'Grifería monocomando cocina',
   'Grifería de cocina.',
   'unidad', 1, 85000),
  (690, 'instalaciones', 'Mesada de cocina',
   'Tres metros de mesada.',
   'metro', 3, 210000),
  (700, 'instalaciones', 'Pileta de lavadero',
   'Pileta independiente.',
   'unidad', 1, 120000),
  (710, 'instalaciones', 'Grifería de lavadero',
   'Grifería y conexiones.',
   'juego', 1, 55000),
  (720, 'instalaciones', 'Termotanque eléctrico 80 litros',
   'Agua caliente para cocina y dos baños.',
   'unidad', 1, 390000),

  -- Electricidad
  (800, 'instalaciones', 'Cable 1,5 mm²',
   'Iluminación.',
   'metro', 220, 850),
  (810, 'instalaciones', 'Cable 2,5 mm²',
   'Tomacorrientes.',
   'metro', 330, 1350),
  (820, 'instalaciones', 'Cable 4 mm²',
   'Circuitos de mayor consumo.',
   'metro', 132, 2300),
  (830, 'instalaciones', 'Cable 6 mm²',
   'Aires acondicionados y alimentaciones dedicadas.',
   'metro', 66, 3500),
  (840, 'instalaciones', 'Caño corrugado eléctrico',
   'Canalización eléctrica.',
   'metro', 275, 850),
  (850, 'instalaciones', 'Cajas eléctricas',
   'Cajas de tomas, llaves y derivaciones.',
   'unidad', 55, 2200),
  (860, 'instalaciones', 'Llaves y tomacorrientes',
   'Tomas y llaves distribuidos por toda la casa.',
   'unidad', 38, 6500),
  (870, 'instalaciones', 'Tablero eléctrico modular',
   'Tablero general.',
   'unidad', 1, 120000),
  (880, 'instalaciones', 'Interruptor diferencial 30 mA',
   'Protección de personas.',
   'unidad', 2, 85000),
  (890, 'instalaciones', 'Termomagnéticas',
   'Protecciones independientes por circuito.',
   'unidad', 10, 28000),
  (900, 'instalaciones', 'Protector de sobretensión',
   'Protección de electrodomésticos.',
   'unidad', 1, 95000),
  (910, 'instalaciones', 'Puesta a tierra completa',
   'Jabalina, cable y accesorios.',
   'juego', 1, 150000),
  (920, 'instalaciones', 'Luminarias LED interiores',
   'Iluminación interior completa.',
   'unidad', 14, 22000),
  (930, 'instalaciones', 'Luminarias LED exteriores',
   'Frente, patio y accesos.',
   'unidad', 5, 32000),

  -- Muebles fijos
  (1000, 'muebles', 'Bajo mesada de cocina',
   'Mueble de aproximadamente tres metros.',
   'unidad', 1, 420000),
  (1010, 'muebles', 'Alacena de cocina',
   'Guardado superior.',
   'unidad', 1, 380000),
  (1020, 'muebles', 'Placard dormitorio principal',
   'Placard principal.',
   'unidad', 1, 650000),
  (1030, 'muebles', 'Placard segundo dormitorio',
   'Placard para segundo dormitorio.',
   'unidad', 1, 550000),

  -- Electrodomésticos y climatización
  (1100, 'electrodomesticos', 'Heladera con freezer 300 litros',
   'Heladera familiar.',
   'unidad', 1, 494000),
  (1110, 'electrodomesticos', 'Cocina a gas 4 hornallas con horno',
   'Cocina completa.',
   'unidad', 1, 224000),
  (1120, 'electrodomesticos', 'Lavarropas automático',
   'Lavarropas automático.',
   'unidad', 1, 494000),
  (1130, 'electrodomesticos', 'Aire acondicionado split 3000 frigorías',
   'Uno para cada dormitorio.',
   'unidad', 2, 525000),
  (1140, 'electrodomesticos', 'Aire acondicionado split 4500 frigorías',
   'Equipo para living/comedor.',
   'unidad', 1, 760000),
  (1150, 'electrodomesticos', 'Ventiladores de techo',
   'Dormitorios y ambientes principales.',
   'unidad', 4, 120000),
  (1160, 'electrodomesticos', 'Microondas',
   'Uso diario.',
   'unidad', 1, 190000),
  (1170, 'electrodomesticos', 'Pava eléctrica',
   'Uso diario.',
   'unidad', 1, 55000),
  (1180, 'electrodomesticos', 'Campana / extractor de cocina',
   'Extracción de humo y humedad.',
   'unidad', 1, 260000),

  -- Muebles
  (1200, 'muebles', 'Cama matrimonial',
   'Dormitorio principal.',
   'unidad', 1, 300000),
  (1210, 'muebles', 'Colchón matrimonial',
   'Colchón principal.',
   'unidad', 1, 420000),
  (1220, 'muebles', 'Mesas de luz',
   'Dormitorio principal.',
   'unidad', 2, 65000),
  (1230, 'muebles', 'Cama segundo dormitorio',
   'Segundo dormitorio.',
   'unidad', 1, 240000),
  (1240, 'muebles', 'Colchón segundo dormitorio',
   'Segundo dormitorio.',
   'unidad', 1, 300000),
  (1250, 'muebles', 'Mesa comedor 6 personas',
   'Mesa familiar.',
   'unidad', 1, 280000),
  (1260, 'muebles', 'Sillas comedor',
   'Seis sillas.',
   'unidad', 6, 65000),
  (1270, 'muebles', 'Sillón 3 cuerpos',
   'Living principal.',
   'unidad', 1, 600000),
  (1280, 'muebles', 'Sillón individual',
   'Living.',
   'unidad', 1, 280000),
  (1290, 'muebles', 'Mesa ratona',
   'Living.',
   'unidad', 1, 120000),
  (1300, 'muebles', 'Mueble TV / guardado living',
   'Mueble para living.',
   'unidad', 1, 260000),
  (1310, 'muebles', 'Mesa exterior / galería',
   'Mesa para patio o galería.',
   'unidad', 1, 220000),
  (1320, 'muebles', 'Sillas exterior',
   'Sillas para patio.',
   'unidad', 4, 55000),

  -- Ajuar
  (1400, 'ajuar', 'Juego de ollas',
   'Juego completo.',
   'juego', 1, 150000),
  (1410, 'ajuar', 'Sartenes',
   'Dos tamaños.',
   'unidad', 2, 35000),
  (1420, 'ajuar', 'Vajilla 6 personas',
   'Platos, tazas y bowls.',
   'juego', 1, 65000),
  (1430, 'ajuar', 'Cubiertos 6 personas',
   'Juego completo.',
   'juego', 1, 55000),
  (1440, 'ajuar', 'Vasos y jarra',
   'Juego de uso diario.',
   'juego', 1, 40000),
  (1450, 'ajuar', 'Utensilios de cocina',
   'Elementos básicos de cocina.',
   'juego', 1, 70000),
  (1460, 'ajuar', 'Sábanas cama matrimonial',
   'Dos juegos.',
   'juego', 2, 55000),
  (1470, 'ajuar', 'Sábanas segundo dormitorio',
   'Dos juegos.',
   'juego', 2, 45000),
  (1480, 'ajuar', 'Almohadas',
   'Cuatro almohadas.',
   'unidad', 4, 25000),
  (1490, 'ajuar', 'Acolchados / frazadas',
   'Uno por dormitorio.',
   'unidad', 2, 85000),
  (1500, 'ajuar', 'Toallas',
   'Toallas para ambos baños.',
   'unidad', 8, 22000),
  (1510, 'ajuar', 'Espejos de baño',
   'Uno por baño.',
   'unidad', 2, 45000),
  (1520, 'ajuar', 'Cortinas / blackout',
   'Dormitorios y ambientes principales.',
   'juego', 1, 320000),
  (1530, 'ajuar', 'Tender',
   'Secado de ropa.',
   'unidad', 1, 65000),
  (1540, 'ajuar', 'Elementos de limpieza',
   'Escoba, secador, baldes, lampazos, palita y tachos.',
   'juego', 1, 95000),
  (1550, 'ajuar', 'Matafuego ABC 5 kg',
   'Seguridad doméstica.',
   'unidad', 1, 95000),
  (1560, 'ajuar', 'Detector de humo',
   'Detección temprana.',
   'unidad', 2, 35000),
  (1570, 'ajuar', 'Botiquín doméstico',
   'Botiquín básico.',
   'juego', 1, 60000);

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
  'ARS',
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
  currency = 'ARS'
from catalog_seed i
join public.campaigns c on c.slug = 'casa-de-norma'
where d.campaign_id = c.id
  and d.title = i.title;

update public.donation_items d
set published_at = null
from public.campaigns c
where c.slug = 'casa-de-norma'
  and d.campaign_id = c.id
  and d.published_at is not null
  and not exists (
    select 1 from catalog_seed i where i.title = d.title
  );

select
  category,
  title,
  unit,
  needed_quantity,
  estimated_unit_amount_minor / 100 as precio_unitario_ars,
  needed_quantity * (estimated_unit_amount_minor / 100) as subtotal_estimado_ars,
  sort_order,
  published_at is not null as publicado
from public.donation_items
where campaign_id = (select id from public.campaigns where slug = 'casa-de-norma')
order by sort_order;
