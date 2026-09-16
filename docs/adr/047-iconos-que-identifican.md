# ADR-047 · Un icono al lado del nombre, siempre que identifique

**Estado**: Aceptada · **Fecha**: 2026-09-16

Enmienda a [ADR-032](./032-relato-mobile-editorial.md) (el selector de país y
los datos para transferir) y a [ADR-012](./012-design-system.md) (de dónde
salen los pictogramas). No toca el relato fotográfico ni el catálogo de
marcas de terceros ([ADR-021](./021-segunda-direccion-visual.md),
`check:marcas`).

## Contexto

Quien llega a `/ayudar/dinero` ve tres países y, en Argentina y Chile, una
lista de datos bancarios. El banco ya lleva su logo (Brubank, Scotiabank). El
resto era texto: el tab de país, Alias, CBU, titular. En la ficha del
catálogo, «Transferencia» tampoco tenía marca; Mercado Pago y PayPal sí.

El pedido es que **donde un icono identifica, vaya**. No como adorno: para
barrer Alias, CBU y país sin leer dos veces. La constitución VIII sigue
prohibiendo la iconografía por relleno —un pictograma al lado de cada
párrafo, un pack de Lucide, un emoji—. Lo que cambia es el vacío en los
lugares que ya se escanean: transferencia, países, caminos de ayudar,
canales de la ficha, llamar y escribir.

## Decisión

1. **Si un control, un campo, un canal o un camino se puede reconocer de un
   vistazo, lleva su marca al lado del nombre.** El nombre no se reemplaza:
   el icono es `aria-hidden` y el texto sigue siendo lo que se lee y se oye.
2. **Tres familias, ningún pack.**
   - Marca de terceros: `BrandMark` / `BrandLabel` (`content/brands.ts`).
   - País: `CountryFlag` (Argentina, Chile) o `GlobeIcon` (internacional).
   - Lo demás: trazo de `components/design-system/icons.tsx`. Sin relleno,
     sin Lucide, sin Heroicons, sin emoji.
3. **En la transferencia, cada fila tiene marca.** Alias, CBU, cuenta,
   titular, CUIT, RUT, correo, banco y tipo salen de `COPY_FIELD_MARKS`. El
   tab de país lleva bandera o globo. «Transferencia» en la ficha lleva el
   pictograma de banco; «traer el mismo bien», el de caja.
4. **Los tres caminos de `/ayudar` también.** Ir, donar plata y traer
   artículos llevan su pictograma al lado del título.
5. **La compuerta es `npm run check:iconos`.** Una etiqueta de `CopyField`
   sin marca, un selector de país sin bandera, un camino de ayudar sin
   pictograma o un `import` de un pack rompen el build. Un párrafo en una
   Skill no alcanza.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir con el tab de país en texto solo | El pedido es reconocer el país de un vistazo. La bandera ya existía en Mercado Pago |
| Un pack de iconos (Lucide, Heroicons) | Se lee como plantilla. La constitución VIII lo cierra como relleno |
| Reemplazar el nombre por el icono | Quien no reconoce el pictograma no sabe qué copia. El lector de pantalla oiría un vacío |
| Poner un icono en cada párrafo del relato | Eso sí es relleno. El relato sigue siendo foto y prosa |

## Consecuencias

**Buenas.** `/ayudar/dinero` se barre: país, banco, Alias, CBU. La ficha
distingue traer, transferir y los dos medios con marca. La regla vive en
Skills, en `.cursor/rules/iconos.mdc` y en la compuerta.

**Malas y aceptadas.** Hay más pictogramas en `icons.tsx`. Cada campo nuevo
de transferencia pide una entrada en `COPY_FIELD_MARKS` o `check:iconos`
falla. El tab de país ahora tiene bandera: ADR-032 decía que el nombre
alcanzaba; esta decisión lo enmienda.
