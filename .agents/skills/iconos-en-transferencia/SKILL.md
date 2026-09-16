---
name: iconos-en-transferencia
description: >-
  Iconos en /ayudar/dinero y en cubrir con plata: bandera o globo en el país,
  marca en cada dato bancario, logo del banco, pictograma de transferencia
  en la ficha. Usar al tocar bank-transfer, donation-selector, country-selector,
  copy-field, cover o ayudar/dinero.
---

# Iconos en la transferencia

Leé esto **antes** de tocar cómo se transfiere. La regla general está en
`iconos-en-la-interfaz`. ADR-047 es la decisión.

## País

`CountrySelector` lleva la marca **en el tab**, al lado del nombre:

- Argentina → `CountryFlag country="AR"`
- Chile → `CountryFlag country="CL"`
- Internacional → `GlobeIcon`

Sin JavaScript, los tres `h3` de país también llevan la misma marca. El
nombre del país no se saca: la bandera es `aria-hidden`.

## Banco y medio

La card de transferencia se titula con `BrandLabel` (Brubank, Scotiabank).
Mercado Pago y PayPal, igual. Un banco nuevo entra en `content/brands.ts` y
en la card; `check:marcas` lo exige.

## Cada dato

`CopyField` no se usa con una etiqueta suelta. La etiqueta tiene que estar
en `COPY_FIELD_MARKS`:

- Alias, CBU, Número de cuenta / Número Cuenta
- Titular, Nombre, CUIT/CUIL, RUT
- Correo, Banco, Tipo

Si la lista de cómputo pide un campo nuevo (CBU, alias de otro banco, SWIFT),
**primero** el pictograma en `icons.tsx` y la entrada en el mapa. Después el
campo. `check:iconos` falla si el `label` no está en el mapa.

El botón de copiar sigue siendo `CopyIcon` → `CheckIcon`. No se toca.

## Ficha del catálogo

En `ChannelRadios`, «Transferencia» lleva `BankIcon`. «Traer el mismo bien»
lleva `BoxIcon`. Mercado Pago y PayPal siguen con `BrandLabel`. Un radio
nuevo de canal sin marca no se mergea.

## Qué no hacer

- Tab de país otra vez en texto solo (ADR-032 lo decía; ADR-047 lo enmendó).
- Un `CopyField` con `label` inventado y sin entrada en el mapa.
- Poner el logo del banco adentro de cada fila: el logo va en el título de
  la card; la fila lleva el pictograma del *tipo* de dato.
