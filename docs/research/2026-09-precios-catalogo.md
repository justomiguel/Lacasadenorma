# Promedios de internet para el catálogo · septiembre 2026

Los `estimated_unit_amount_minor` de `docs/sql/catalogo-casa-basica.sql`.
Cada fila tiene fuente y fecha. Son **estimados de artículo nuevo**, no una
cotización de Formosa ni lo que va a pedir el corralón. Si en el negocio sale
otra cosa, vale esa (ADR-041, ADR-044).

Un ítem que no está acá queda con estimado nulo. No se rellena.

Montos en pesos argentinos de góndola (con IVA) salvo que la fuente diga lo
contrario. En la base se guardan en centavos (`pesos × 100`).

## Cómo se eligió cada número

1. **Formosa primero** cuando hay un valor de esa plaza para esa unidad.
2. Si no, **promedio publicado** (Red Materiales, MejoresCompras) o **punto
   medio de un rango publicado en 2026**.
3. Obra Maestra publica **sin IVA** (Buenos Aires, julio 2026): se le aplica
   21 % y se redondea al peso. No se le suma flete a Formosa: CAEDE habla de
   10–20 % extra y aplicarlo a ojo sería inventar.
4. ATP Formosa RG 18/2026 (14 de abril de 2026) son **valores fiscales
   mínimos de referencia**, no el ticket. La propia resolución dice que
   diferían de los valores de plaza. Se usan sólo cuando no hay un promedio
   de góndola para esa unidad exacta.
5. Una góndola suelta se usa sólo cuando es la unidad del catálogo (una
   puerta, un bidet, una pava) y no hay un promedio de esa categoría.

## Materiales

| Título en el catálogo | Unidad | Pesos | Fuente |
|---|---|---|---|
| Ladrillos comunes | unidad | 145 | ATP Formosa RG 18/2026, valor fiscal mínimo, ladrillo común |
| Ladrillos huecos 18x18x33 | unidad | 480 | ATP Formosa RG 18/2026, ladrillo cerámico hueco N° 18 |
| Cemento | bolsa 50 kg | 11.858 | Obra Maestra jul 2026, Sodimac/Easy/Red Materiales, 8.100–11.500 sin IVA → punto medio 9.800 × 1,21 |
| Cal hidratada | bolsa 25 kg | 3.500 | ATP Formosa RG 18/2026, cal bolsa 25 kg. No hay promedio de góndola 2026 para esa bolsa |
| Arena | m³ | 46.585 | Obra Maestra jul 2026, arena de río 30.000–47.000 sin IVA → 38.500 × 1,21 |
| Ripio | m³ | 90.145 | Obra Maestra jul 2026, piedra granítica 6/20 54.000–95.000 sin IVA → 74.500 × 1,21. El catálogo pide ripio; la fuente más cercana es esa piedra |
| Hidrófugo | litro | 2.600 | Red Materiales, Sika 1 sachet × 1 kg, sep 2026. Densidad ~1 kg/L; es la presentación que coincide con el litro del catálogo |
| Chapas de techo | m² | 18.000 | Servidos, calculadora de techo 2026, chapa galvanizada 14.000–22.000 / m² |
| Cerámico de piso | m² | 15.730 | Obra Maestra jul 2026, cerámica 60×60 6.000–20.000 sin IVA → 13.000 × 1,21 |
| Azulejos de cocina | m² | 15.730 | El mismo rango de cerámica de revestimiento |
| Azulejos de baño | m² | 15.730 | Idem |
| Pintura | litro | 6.595 | Obra Maestra jul 2026, látex interior 20 L 72.000–146.000 sin IVA → 109.000 / 20 × 1,21 |
| Tirantes de techo | unidad | 26.460 | AFL Techos, tirante pino elliottis 2×6, rango 15.320–37.600 según largo → punto medio |
| Cielorraso | m² | 5.588 | Obra Maestra jul 2026, placa Durlock 12,5 mm 1,2×2,4 m 12.100–14.500 sin IVA → 13.300 / 2,88 m² × 1,21 |
| Zócalos | metro | 1.101 | El mismo cerámico de piso, zócalo de 7 cm: 15.730 × 0,07. No hay unitario 2026 por metro lineal de zócalo de góndola |
| Enduido | bolsa | 55.418 | Obra Maestra jul 2026, enduido 25 kg 38.800–52.800 sin IVA → 45.800 × 1,21 |
| Cable eléctrico | metro | 938 | Obra Maestra jul 2026, unipolar 2,5 mm² 700–850 / m sin IVA → 775 × 1,21 |
| Caños de agua | metro | 5.264 | Obra Maestra jul 2026, PVC 63 mm × 4 m 14.600–20.200 sin IVA → 17.400 / 4 × 1,21 |
| Caños de desagüe | metro | 7.034 | Obra Maestra jul 2026, PVC 110 mm × 4 m 22.000–24.500 sin IVA → 23.250 / 4 × 1,21 |

## Aberturas

| Título | Unidad | Pesos | Fuente |
|---|---|---|---|
| Puerta de entrada | unidad | 425.373 | Capri Materiales, Occhipinti chapa inyectada: 70/80 cm 348.806 y 90 cm pesada 501.940 → punto medio |
| Puertas interiores | unidad | 505.220 | CASE, presupuesto vivienda ago 2025, puerta placa interior. Es el único unitario publicado; 2025, no Formosa |
| Ventanas | unidad | 386.691 | CASE ago 2025, ventana aluminio 1,50×1,00 a 257.794 / m² × 1,5 m² |
| Rejas | unidad | 185.695 | CASE ago 2025, reja metálica |
| Portón | unidad | 405.490 | CASE ago 2025, puerta ventana de aluminio 1,60×2,00. No hay cotización de portón de frente |

## Instalaciones

| Título | Unidad | Pesos | Fuente |
|---|---|---|---|
| Tanque de agua | unidad | 140.000 | Waterfusion, tanque tricapa 500 L, góndola 2026 |
| Bomba de agua | unidad | 207.561 | Sanitarios Illia, kit elevadora Pluvius QB60 1/2 HP + control automático, góndola. Es el equipo chico de llenado de tanque, no un promedio de categoría |
| Cámara séptica | unidad | 335.639 | Cámara 1.000 L: Deplano PRECONS 191.278 y Biodigestores fábrica 480.000 → punto medio |
| Inodoro | unidad | 250.439 | Bairesmat, inodoro con mochila Piazza Domani |
| Bidet | unidad | 152.356 | Ferrum Andina: El amigo 132.520 y Acon Materiales 172.191 → punto medio |
| Tina | unidad | 366.454 | Accesaniga, bañera Ferrum acero enlozado 150 cm |
| Lavatorio | unidad | 62.672 | Ferrum Andina 3 agujeros: Riboldi 59.177, Ferrocons 63.607, Darsie 65.231 → promedio |
| Vanitory | unidad | 78.806 | Dimora, vanitory Campo 50 cm + mesada marmolina |
| Mesada de cocina | metro | 207.787 | Dimora, mesada de loza Schneider 100 cm. La unidad del catálogo es el metro; esa pieza mide 1 m |
| Grifería de baño | juego | 226.650 | Dimora, línea Cd Turin: lavatorio 55.605 + bidet 66.667 + ducha 104.378. Tres góndolas de la misma línea, no un combo de marca |
| Grifería de cocina | juego | 39.748 | Dimora, Cd Napoli monocomando de mesada |
| Llaves y tomacorrientes | unidad | 2.329 | Eléctrica Mosconi, combo Jeluz 6 puntos 13.977 → 13.977 / 6. Punto completo (módulo + tapa), no el módulo suelto |

## Electrodomésticos y línea blanca

| Título | Unidad | Pesos | Fuente |
|---|---|---|---|
| Cocina | unidad | 510.000 | Info Central ago 2026, cocina a gas acero, franja media 490.000–530.000 |
| Heladera | unidad | 834.950 | iProfesional 2026 outlet desde 399.999; Super MaMi Whirlpool No Frost 1.269.900. Punto medio |
| Lavarropas | unidad | 620.000 | MejoresCompras, mediana de automáticos que siguen en Mercado Libre, ago 2026 |
| Ventiladores | unidad | 149.900 | Casa El Trébol, ventilador de pie Midea 16″ inverter. Góndola, no un promedio de categoría |
| Calefón o termotanque | unidad | 475.000 | Todo Resuelto, calefón a gas 14 L solo equipo, góndola 2026-08-01, 350.000–600.000 |
| Plancha | unidad | 24.000 | Pocorena Hogar, Atma Classic. Góndola de plancha chica |
| Microondas | unidad | 169.199 | Productos Virales, BGH Quick Chef 20 L el más vendido, precio verificado 14 sep 2026 |
| Pava eléctrica | unidad | 53.810 | MejoresCompras, seis pavas 38.620–69.000, sep 2026 → punto medio |
| Campana extractora | unidad | 290.800 | Casa Martínez, TST Traful 60 cm acero. Góndola de 60 cm, el ancho de una cocina chica |

## Muebles y ajuar

| Título | Unidad | Pesos | Fuente |
|---|---|---|---|
| Cama plaza y media | unidad | 220.000 | Hogar Rosario, cama box 0,90×1,90 210.000–230.000 → punto medio |
| Colchón plaza y media | unidad | 287.140 | El Apoliyo, espuma 90×190 225.280; Sueño Dorado, resorte 90×190 348.999 → punto medio |
| Ropero | unidad | 110.000 | Larocca, roperos eco «desde» junio 2026 |
| Mesa de luz | unidad | 40.999 | Superprecio, mesa de luz eco de lista |
| Mesa de cocina | unidad | 59.900 | Larocca, mesas «desde» junio 2026 |
| Sillas | unidad | 60.000 | Elementos Design, silla Tulip (oferta sobre 65.000) |
| Sillón de dos cuerpos | unidad | 502.346 | Susilla Lena 404.692 y Elementos Eco 600.000 → punto medio |
| Mesa ratona | unidad | 49.999 | Frávega, mesa ratona auxiliar Home Make |
| Banqueta de cocina | unidad | 61.200 | Susilla, taburete 3010 |
| Juego de ollas | juego | 135.542 | AZZA, Tramontina 10 piezas |
| Sartenes | unidad | 29.050 | Mastersupply, sartén Hudson 28 cm antiadherente |
| Sábanas plaza y media | juego | 38.746 | Pretahome, 1½ plaza: Jean Cartier 23.691 y Alcoyana 53.801 → punto medio |
| Zapatillas eléctricas | unidad | 16.147 | Electrovoltaje, zapatilla Candela 5 tomas 1,3 m |

## Qué queda nulo a propósito

Hierro en atados (Red Materiales publica **por barra** de 12 m, promedio 8 mm
12.260 en sep 2026; el catálogo pide atados y Acindar vende a granel, no hay
cuántas barras van en un atado), clavos y alambre (el índice es **por kilo**,
promedio Red Materiales 5.054; el catálogo pide un juego de obra),
receptáculo de ducha, pileta de cocina, mampara, extractor de baño, caños de
gas, garrafa y regulador, tablero eléctrico (las cifras publicadas mezclan
mano de obra o son sólo el gabinete), accesorios de baño, bajo mesada y
alacena (hay combos de cocina entera, no el módulo suelto), vajilla /
cubiertos / vasos / utensilios / tabla (los sets publicados los mezclan),
almohadas, acolchado, toallas, cortina de baño, espejo, cortinas, tender,
balde y lampazo, escoba y palita, lámparas y perchas: no hay un unitario 2026
con la unidad del catálogo que se pueda citar sin inventar el modelo o el
tamaño del kit.

Esos se cargan a mano desde `/admin/catalogo` cuando haya una cotización.

## Fuentes

- ATP Formosa, Resolución General 18/2026, anexo I, 14 de abril de 2026. https://www.atpformosa.gob.ar/descargas/resol/2026/resol_gral_18-2026.pdf
- Obra Maestra, precios de materiales Argentina, julio 2026, sin IVA, Buenos Aires. https://obramaestra.com/ar/precios-materiales
- Red Materiales, hidrófugos, septiembre 2026. https://redmateriales.com.ar/precios/hidrofugos
- Red Materiales, hierro, septiembre 2026. https://redmateriales.com.ar/precios/hierro
- Red Materiales, clavos y alambre, septiembre 2026. https://redmateriales.com.ar/precios/clavos-alambres
- Servidos, calculadora de costo de techo Argentina 2026. https://servidos.ar/calculadora-costo-techo
- AFL Techos, tirante pino 2×6. https://afltechos.com.ar/producto/tirante-de-madera-2x6-de-pino-eliottis/
- Capri Materiales, puertas chapa inyectada Occhipinti. https://www.caprimateriales.com.ar/Puertas-chapa-inyectada
- Waterfusion, tanque 500 L tricapa. https://www.waterfusion.com.ar/productos/tanque-torre-ultradelgado-fino-largo-500-litros-tricapa-64-cm-diametro-x-160-cm-alto/
- Sanitarios Illia, kit bomba QB60. https://sanitariosillia.com.ar/producto/bomba-centrifuga-qb60-controlador-automatico-presion-smart/
- Deplano, cámara séptica PRECONS 1000 L. https://www.deplano.com.ar/tanques-y-camaras/15074-camara-septica-1000-lt-preconsimpacto.html
- Biodigestores, cámara séptica 1000 L. https://biodigestores.ar/camara-septica-1000-litros
- Todo Resuelto, instalar calefón 2026. https://todoresuelto.com/cuanto-cuesta/instalar-calefon
- Info Central, cocina a gas acero inoxidable, agosto 2026. https://www.infocentral.com.ar/articulo/cuanto-cuesta-una-cocina-a-gas-de-acero-inoxidable-en-agosto-de-2026-en-argentina.php
- iProfesional, outlet de línea blanca 2026. https://www.iprofesional.com/economia/460171-el-outlet-que-liquida-heladeras-desde-399999-pesos-y-lavarropas-con-hasta-50-por-ciento-de-descuento
- Super MaMi / Dino, heladera Whirlpool No Frost WRM42HK/44. https://www.dinoonline.com.ar/super/producto/heladera-whirlpool-combi-wre57k1-2/_/A-4172734-4172734-s
- MejoresCompras, lavarropas automáticos 2026. https://mejorescompras.com.ar/lavado/mejores-lavarropas-automaticos-2026
- MejoresCompras, pavas eléctricas 2026. https://mejorescompras.com.ar/pequenos-electrodomesticos/mejores-pavas-electricas-2026
- Productos Virales, microondas Argentina 2026. https://productosvirales.com.ar/guias/cocina/microondas
- Bairesmat, inodoro con mochila Piazza Domani. https://bairesmat.com.ar/productos/inodoro-con-mochila-economico-piazza-domani-tipo-ferrum-blanco/
- El amigo, bidet Ferrum Andina. https://www.elamigo.com.ar/bidet-3-agujeros-ferrum-andina-bea3-dorado/p
- Acon Materiales, bidet Ferrum Andina. https://www.aconmateriales.com.ar/productos/bidet-ferrum-andina/
- Accesaniga, bañera Ferrum 150 cm. https://accesaniga.com.ar/producto/banera-acero-enlozado-150cm-ferrum/
- Riboldi, lavatorio Ferrum Andina. https://riboldimateriales.com.ar/producto/ferrum-lavatorio-3-a-andina-blanco/
- Ferrocons, lavatorio Ferrum Andina. https://www.ferrocons.com.ar/lavatorios/578-ferrum-andina-lavatorio-3agblanco-lea3.html
- Darsie, lavatorio Ferrum Andina. https://www.darsie.com/lavatorios-y-columnas/40-lavatorio-3a-andina-lea3-b.html
- Dimora, vanitory, mesada y griferías. https://dimora.com.ar/
- Eléctrica Mosconi, combo Jeluz 6 puntos. https://electricamosconi.com.ar/productos/combo-6-puntos-simples-jeluz-negro-negro-negro/
- Casa El Trébol, ventilador Midea 16″. https://casaeltrebol.com.ar/producto/ventilador-de-pie-midea-16-inverter/
- Pocorena Hogar, plancha Atma. https://www.pocorenahogar.com.ar/
- Casa Martínez, campana TST Traful 60 cm. https://www.casamartinezsa.com.ar/electrodomesticos/cocinas-y-hornos/campanas-y-extractores/
- Hogar Rosario, camas box plaza y media. https://www.hogarosario.com.ar/dormitorio/camas-box/1-plaza-y-1-plaza-y-media
- El Apoliyo, colchón 90×190. https://www.elapoliyo.com.ar/por-tamano/colchones/1-1-2-plaza/90-x-190-cm/?Medida=90x190
- Sueño Dorado, colchón resorte 90×190. https://suenodorado.com.ar/productos/colchon-resorte-1-plaza-y-media-90-x-190-x-25-linea-sanzio/
- Larocca, muebles de pino, precios junio 2026. https://www.mueblesycolchoneslarocca.com/
- Superprecio, mesa de luz. https://superprecio.com.ar/productos/ropero-1-20-comoda-32/
- Elementos Design, silla Tulip y sillón eco. https://www.elementosdesign.com.ar/
- Susilla, sillón Lena y taburete. https://susilla.com/
- Frávega, mesas ratonas. https://www.fravega.com/l/muebles/living-y-comedor/mesas-ratonas/
- AZZA, juego de ollas Tramontina 10 piezas. https://azza.empretienda.com.ar/bazar/ollas/juegos-de-ollas-tramontina-10-piezas
- Mastersupply, sartén Hudson. https://www.mastersupply.com.ar/productos/set-juego-bateria-ollas-tramontina-paris-negro-9-piezas/
- Pretahome, sábanas 1½ plaza. https://www.pretahome.com/dormitorio/juegos-de-sabanas/1-1-2-plaza-twin/
- Electrovoltaje, zapatilla Candela. https://www.electrovoltaje.com/productos/zapatilla-5-tomacorrientes-13mts-largo-candela-ilz76/
- CASE, memoria descriptiva presupuesto vivienda, agosto 2025. https://www.casesgo.com.ar/docs/tecnicos/case_memoria_descriptiva.pdf
- CAEDE, costo de construcción Formosa (flete 10–20 %, no aplicado). https://caede.com.ar/costos-construccion/costo-construccion-formosa/
