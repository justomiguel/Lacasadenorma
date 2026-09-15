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
2. Si no, **punto medio de un rango publicado en 2026**.
3. Obra Maestra publica **sin IVA** (Buenos Aires, julio 2026): se le aplica
   21 % y se redondea al peso. No se le suma flete a Formosa: CAEDE habla de
   10–20 % extra y aplicarlo a ojo sería inventar.
4. ATP Formosa RG 18/2026 (14 de abril de 2026) son **valores fiscales
   mínimos de referencia**, no el ticket. La propia resolución dice que
   diferían de los valores de plaza. Se usan sólo cuando no hay un promedio
   de góndola para esa unidad exacta.

## Materiales

| Título en el catálogo | Unidad | Pesos | Fuente |
|---|---|---|---|
| Ladrillos comunes | unidad | 145 | ATP Formosa RG 18/2026, valor fiscal mínimo, ladrillo común |
| Ladrillos huecos 18x18x33 | unidad | 480 | ATP Formosa RG 18/2026, ladrillo cerámico hueco N° 18 |
| Cemento | bolsa 50 kg | 11.858 | Obra Maestra jul 2026, Sodimac/Easy/Red Materiales, 8.100–11.500 sin IVA → punto medio 9.800 × 1,21 |
| Cal hidratada | bolsa 25 kg | 3.500 | ATP Formosa RG 18/2026, cal bolsa 25 kg. No hay promedio de góndola 2026 para esa bolsa |
| Arena | m³ | 46.585 | Obra Maestra jul 2026, arena de río 30.000–47.000 sin IVA → 38.500 × 1,21 |
| Ripio | m³ | 90.145 | Obra Maestra jul 2026, piedra granítica 6/20 54.000–95.000 sin IVA → 74.500 × 1,21. El catálogo pide ripio; la fuente más cercana es esa piedra |
| Chapas de techo | m² | 18.000 | Servidos, calculadora de techo 2026, chapa galvanizada 14.000–22.000 / m² |
| Cerámico de piso | m² | 15.730 | Obra Maestra jul 2026, cerámica 60×60 6.000–20.000 sin IVA → 13.000 × 1,21 |
| Azulejos de cocina | m² | 15.730 | El mismo rango de cerámica de revestimiento |
| Azulejos de baño | m² | 15.730 | Idem |
| Pintura | litro | 6.595 | Obra Maestra jul 2026, látex interior 20 L 72.000–146.000 sin IVA → 109.000 / 20 × 1,21 |
| Cielorraso | m² | 5.588 | Obra Maestra jul 2026, placa Durlock 12,5 mm 1,2×2,4 m 12.100–14.500 sin IVA → 13.300 / 2,88 m² × 1,21 |
| Enduido | bolsa | 55.418 | Obra Maestra jul 2026, enduido 25 kg 38.800–52.800 sin IVA → 45.800 × 1,21 |
| Cable eléctrico | metro | 938 | Obra Maestra jul 2026, unipolar 2,5 mm² 700–850 / m sin IVA → 775 × 1,21 |
| Caños de agua | metro | 5.264 | Obra Maestra jul 2026, PVC 63 mm × 4 m 14.600–20.200 sin IVA → 17.400 / 4 × 1,21 |
| Caños de desagüe | metro | 7.034 | Obra Maestra jul 2026, PVC 110 mm × 4 m 22.000–24.500 sin IVA → 23.250 / 4 × 1,21 |

## Aberturas

| Título | Unidad | Pesos | Fuente |
|---|---|---|---|
| Puertas interiores | unidad | 505.220 | CASE, presupuesto vivienda ago 2025, puerta placa interior. Es el único unitario publicado; 2025, no Formosa |
| Ventanas | unidad | 386.691 | CASE ago 2025, ventana aluminio 1,50×1,00 a 257.794 / m² × 1,5 m² |
| Rejas | unidad | 185.695 | CASE ago 2025, reja metálica |
| Portón | unidad | 405.490 | CASE ago 2025, puerta ventana de aluminio 1,60×2,00. No hay cotización de portón de frente |

## Instalaciones y línea blanca

| Título | Unidad | Pesos | Fuente |
|---|---|---|---|
| Tanque de agua | unidad | 140.000 | Waterfusion, tanque tricapa 500 L, góndola 2026 |
| Inodoro | unidad | 250.439 | Bairesmat, inodoro con mochila Piazza Domani |
| Calefón o termotanque | unidad | 475.000 | Todo Resuelto, calefón a gas 14 L solo equipo, góndola 2026-08-01, 350.000–600.000 |
| Cocina | unidad | 510.000 | Info Central ago 2026, cocina a gas acero, franja media 490.000–530.000 |
| Heladera | unidad | 834.950 | iProfesional 2026 outlet desde 399.999; Super MaMi Whirlpool No Frost 1.269.900. Punto medio |
| Lavarropas | unidad | 437.490 | iProfesional 2026, automáticos 299.990–574.990 |

## Qué queda nulo a propósito

Hidrófugo (el índice es por bolsa de 25 kg, el catálogo pide litros), hierro
en atados, tirantes, zócalos, clavos, puerta de entrada (la fuente es placa
interior), bomba, cámara séptica, bidet, tina, receptáculo, lavatorio,
vanitory, pileta, mesada, griferías, mampara, extractor, caños de gas,
garrafa, llaves, tablero, accesorios de baño, ventiladores, plancha,
microondas, pava, campana, y todo el ajuar y los muebles: no hay un
unitario 2026 con fuente que se pueda citar sin inventar el modelo.

Esos se cargan a mano desde `/admin/catalogo` cuando haya una cotización.

## Fuentes

- ATP Formosa, Resolución General 18/2026, anexo I, 14 de abril de 2026. https://www.atpformosa.gob.ar/descargas/resol/2026/resol_gral_18-2026.pdf
- Obra Maestra, precios de materiales Argentina, julio 2026, sin IVA, Buenos Aires. https://obramaestra.com/ar/precios-materiales
- Servidos, calculadora de costo de techo Argentina 2026. https://servidos.ar/calculadora-costo-techo
- Waterfusion, tanque 500 L tricapa. https://www.waterfusion.com.ar/productos/tanque-torre-ultradelgado-fino-largo-500-litros-tricapa-64-cm-diametro-x-160-cm-alto/
- Todo Resuelto, instalar calefón 2026. https://todoresuelto.com/cuanto-cuesta/instalar-calefon
- Info Central, cocina a gas acero inoxidable, agosto 2026. https://www.infocentral.com.ar/articulo/cuanto-cuesta-una-cocina-a-gas-de-acero-inoxidable-en-agosto-de-2026-en-argentina.php
- iProfesional, outlet de línea blanca 2026. https://www.iprofesional.com/economia/460171-el-outlet-que-liquida-heladeras-desde-399999-pesos-y-lavarropas-con-hasta-50-por-ciento-de-descuento
- Super MaMi / Dino, heladera Whirlpool No Frost WRM42HK/44. https://www.dinoonline.com.ar/super/producto/heladera-whirlpool-combi-wre57k1-2/_/A-4172734-4172734-s
- Bairesmat, inodoro con mochila Piazza Domani. https://bairesmat.com.ar/productos/inodoro-con-mochila-economico-piazza-domani-tipo-ferrum-blanco/
- CASE, memoria descriptiva presupuesto vivienda, agosto 2025. https://www.casesgo.com.ar/docs/tecnicos/case_memoria_descriptiva.pdf
- CAEDE, costo de construcción Formosa (flete 10–20 %, no aplicado). https://caede.com.ar/costos-construccion/costo-construccion-formosa/
