# ADR-025 · El mockup aprobado es la fuente de verdad visual

**Estado**: Aceptada · **Fecha**: 2026-09-12

Reemplaza, para la dirección de arte del sitio público, lo que ADR-021 y ADR-024
decidieron sobre paleta, tipografía, radio, navegación y recorrido de la home.
No reemplaza lo que esos ADR decidieron sobre contenido: sigue prohibido inventar
datos, fotos de stock, cifras y una fundación que no existe.

## Contexto

El 12 de septiembre de 2026 se entregó un mockup visual —escritorio, teléfono y
hoja de sistema— y se lo marcó como diseño aprobado. No es una referencia ni un
moodboard. Es el diseño.

Hasta acá el sitio público se gobernaba por `ux.md` y por dos ADR de dirección
visual. Esos documentos produjeron un documento editorial sobrio, con radio de
2 px, grotesca argentina en los títulos y un acento verde agua sacado de la
pared. El mockup pide otra cosa: Playfair Display + Inter, una gama de verdes
bosque, botones píldora, un header oscuro superpuesto al hero, un menú hamburguesa
en el teléfono, y un recorrido de scroll que es un relato, no un índice de
páginas.

La skill `frontend-design` y la regla `.cursor/rules/diseno.mdc` describen cómo
hacer las cosas en general. El mockup describe cómo se hacen **acá**. En el punto
donde chocan, gana el mockup. Eso incluye los delatores que esas fuentes enumeran
—sobrelínea numerada, radio grande, serif de display— cuando el mockup los usa a
propósito, como capítulos de una secuencia y no como chrome.

## Decisión

1. **El mockup es la fuente de verdad visual.** Paleta, tipografía, composición,
   jerarquía, botones, header, hero, ritmo y el recorrido de la home se copian de
   ahí. No se reinterpretan. No se «mejoran».
2. **Las Skills ejecutan el mockup.** Sirven para accesibilidad, responsive,
   performance, motion sutil, SEO y calidad de implementación. No tienen autorización
   para cambiar la dirección de arte.
3. **El contenido sigue siendo el de siempre.** Fotos reales de `public/fotos/`.
   Cuentas, teléfono de Saúl y materiales, los que el mockup y la familia
   publicaron. Sin cantidades, sin precios, sin URLs inventadas. Fundación Norma
   sigue sin existir. Las secciones financieras públicas que se rechazaron
   —totales, libro de gastos, presupuesto, avance de obra, avisos de «no pudimos
   leer las cifras»— salen del DOM, no se esconden.
4. **Las cuentas de aporte publicadas viven en el contenido versionado**, no en
   la base, para esta superficie. Son datos verificados y estables: titular, CBU,
   alias, cuenta chilena. La base sigue siendo el lugar de aportes, gastos y
   novedades. Mercado Pago y PayPal se muestran como canales; el botón no se
   renderiza hasta que haya una URL real.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Tratar el mockup como inspiración y «traducirlo» al sistema anterior | Es exactamente lo que se pidió no hacer |
| Inventar la foto de paisaje del cierre porque el mockup la muestra | No hay esa foto. Se usa una foto real del lugar |
| Seguir leyendo las cuentas desde la base en la home | Sin fila publicada el mockup quedaría vacío; con el fixture de desarrollo mostraría «CUENTA DE PRUEBA» |
| Dejar las cifras públicas y «diseñarlas» con la paleta nueva | Esas secciones se rechazaron con nombre y apellido |

## Consecuencias

- `app/globals.css` y `app/fonts.ts` cambian. Playfair Display, Inter y una
  manuscrita (Caveat) reemplazan a Archivo y Newsreader en el sitio público.
- El radio de 2 px deja de ser el máximo: el mockup usa píldoras y tarjetas.
- La home deja de ser un índice de páginas con FAQ. El scroll es
  pérdida → comunidad → acción → donación → Norma → legado.
- `/contacto` existe. La navegación primaria es la del mockup.
- `/transparencia` y `/reconstruccion` siguen como URL, sin widgets de cifras.
- `e2e/comun/revision-visual.spec.ts` deja de prohibir el radio del mockup.
- La tarjeta de Open Graph cambia de color. Las vistas previas ya compartidas en
  WhatsApp no se actualizan solas.

**Skills usadas para ejecutar, no para diseñar:** `frontend-design` (calidad de
implementación, contraste, motion contenido, `prefers-reduced-motion`), y las
reglas de accesibilidad y performance del proyecto.
