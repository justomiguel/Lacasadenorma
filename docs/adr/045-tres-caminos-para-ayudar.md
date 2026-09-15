# ADR-045 · Tres caminos para ayudar, no pestañas

**Estado**: Aceptada · **Fecha**: 2026-09-15

Reemplaza la decisión 5 de [ADR-026](./026-jerarquia-y-capitulos.md): las tres
formas de ayudar dejan de ser pestañas de un solo capítulo. Conserva de
[ADR-032](./032-relato-mobile-editorial.md) las tres familias de acción, el
`DonationSelector` y que el CTA primario dice «Ayudar a reconstruir».

## Contexto

La dueña del proyecto pidió el 15 de septiembre de 2026 que el enlace
«Ayudar a reconstruir» lleve a **una pantalla que diga de manera clara uno de
tres caminos**: dar una mano presencial, donar dinero, donar artículos. Cada
camino lleva a su destino; no se elige detrás de una pestaña.

Hoy `/ayudar` y el capítulo 03 de la home resuelven las tres formas con
`HelpTabs`. Quien quiere ir, o traer algo, tiene que descubrir que existe otra
pestaña. El tablero de donaciones —Argentina, Chile, PayPal— queda mezclado
con el contacto y con una lista fija de materiales que ya no es la fuente de
verdad: lo que falta está en `/catalogo`.

No hay un lote ni unas coordenadas verificadas de la casa. Lo que sí está
publicado, y es cierto, es que la casa está en Riacho He Hé, Formosa. Un pin
inventado sobre un terreno ajeno sería el dato falso de mayor consecuencia
posible en este camino. Un `iframe` de Google Maps está prohibido: abre
`frame-src`, trae cookies de un tercero ([ADR-010](./010-analytics-privacidad.md))
y el modelo de amenazas lo trata como XSS (T4).

## Decisión

1. **`/ayudar` es el tablero de los tres caminos.** No hay pestañas. Los tres
   están a la vista, cada uno con un título, una línea y una acción secundaria
   (texto y flecha). El CTA «Ayudar a reconstruir» apunta acá. La home muestra
   los mismos tres caminos en el capítulo 03, para que se entienda cómo
   colaborar sin abandonar el relato (FR-002).
2. **Dar una mano presencial lleva a `/contacto`.** Ahí está Justo Miguel
   Vargas (WhatsApp, teléfono, correo, Instagram) y un enlace a Google Maps
   que abre **el pueblo**. El copy dice que el lote exacto lo indica Justo
   cuando se coordina. No se publica una calle ni un pin de la casa.
3. **Donar dinero lleva a `/ayudar/dinero`.** Ahí vive el `DonationSelector` de
   ADR-032: Argentina, Chile, el resto del mundo (PayPal). El sitio no cobra.
4. **Donar artículos lleva a `/catalogo`.** Es lo que falta, con cantidades y
   reservas. La lista fija «cemento, cal, arena, chapa» de `ayudar.json` se
   borra: era una promesa que el catálogo ya cumple.
5. **El mapa es un enlace, no un incrustado.** El botón nombra Google Maps y
   lleva el logo de Google al lado, como el resto de las marcas de terceros.
   La URL sale del contenido, verificada, y busca el pueblo. El día que haya
   un lote publicado se cambia esa URL, no el componente.
6. **SC-002 se cuenta sobre este recorrido.** Desde la home: «Ayudar a
   reconstruir» → Donar dinero → Copiar. Argentina ya está elegida. Elegir
   Chile o PayPal es un toque más, en la página de dinero.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir con pestañas | Escondían dos de los tres caminos. El pedido es que se vean |
| Tres tarjetas en `/ayudar` | El sitio no es una colección de cards (ADR-032) |
| Incrustar Google Maps | Cookies, `iframe`, CSP. El enlace abre Maps de verdad |
| Publicar un pin de la casa con coordenadas aproximadas | No hay lote verificado. Un pin en el lugar equivocado manda gente a otra casa |
| Un `/ayudar/terreno` aparte de `/contacto` | Duplicaría el contacto de Justo. `/contacto` ya es esa página |
| Dejar el tablero de donaciones en `/ayudar` y poner los caminos arriba | Quien llega a donar no eligió todavía; los tres tienen que verse iguales |
| Mandar «donar artículos» a la pestaña de materiales | Esa lista no se actualiza. El catálogo sí |

## Consecuencias

**Buenas.** Los tres caminos se leen de un vistazo. El catálogo deja de ser un
destino escondido. El tablero de donaciones tiene una página propia, y copiar
sigue siendo tres toques desde la home.

**Malas y aceptadas.**

- Copiar desde la home ya no se hace sin cambiar de página: hay que pasar por
  `/ayudar` y por `/ayudar/dinero`. Es el costo de no mezclar plata con ir y
  con traer.
- El mapa no sitúa el lote. Quien va tiene que escribirle a Justo. El día
  que la familia publique el punto, se cambia `contact.mapsUrl`.
- `HelpTabs` desaparece. `SectionTabs` sigue para la cuenta.

**Compuerta.** Un e2e recorre los tres caminos y afirma que `/ayudar` no tiene
el tablero de donaciones. `aportes.spec.ts` y `portapapeles.spec.ts` corren en
`/ayudar/dinero`. El schema exige `mapsUrl` como URL, y el test de contenido
afirma que apunta a Google Maps y nombra Riacho He Hé.
