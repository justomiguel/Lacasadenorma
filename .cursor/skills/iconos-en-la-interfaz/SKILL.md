---
name: iconos-en-la-interfaz
description: >-
  Poner un icono identificador al lado del nombre en cada control, campo,
  canal, camino o acción de la interfaz. Usar siempre que se toque app/,
  components/ o se agregue un botón, tab, radio, enlace o dato copiable.
---

# Iconos que identifican

Leé esta Skill **antes** de tocar una pantalla. Si choca con
`.cursor/rules/trabajo.mdc` o con la constitución, ganan ellos. El detalle
de la transferencia está en `iconos-en-transferencia`.

## Qué hacer

Donde un control se puede reconocer de un vistazo, **el icono va al lado del
nombre**. No se espera a que alguien lo pida. No se deja «para después».

| Superficie | Marca | Dónde vive |
|---|---|---|
| Marca de terceros (PayPal, Brubank, WhatsApp…) | Logo al lado del nombre | `BrandLabel` / `BrandMark` |
| País (Argentina, Chile) | Bandera al lado del nombre | `CountryFlag` |
| Internacional / resto del mundo | Globo al lado del nombre | `GlobeIcon` |
| Dato bancario (Alias, CBU, titular…) | Pictograma de la etiqueta | `COPY_FIELD_MARKS` en `copy-field.tsx` |
| Canal (traer, transferir, Mercado Pago, PayPal) | Caja, banco o `BrandLabel` | `cover.tsx` |
| Camino de `/ayudar` | Manos, billete, caja | `help-paths.tsx` |
| Llamar / escribir | Teléfono / sobre | `contact-actions.tsx` |
| Acción (copiar, cerrar, menú, flecha) | Ya está; no se saca | `icons.tsx` + `ICON_ACTION` |

El nombre **no se reemplaza**. El icono es `aria-hidden`. Quien no reconoce
el pictograma sigue leyendo «CBU». El lector de pantalla oye el nombre, no
«imagen».

## De dónde salen

Una sola familia de trazo: `components/design-system/icons.tsx` (1.5, round,
20 px, `currentColor`). Las marcas de terceros no son pictogramas: van en
`content/brands.ts`. Las banderas no heredan tinta: `flags.tsx`.

Si falta un pictograma, **se agrega ahí**. No se importa Lucide, Heroicons,
Tabler, Phosphor ni `react-icons`. No se pega un SVG suelto en el
componente. No hay emoji.

## Qué no hacer

- Un icono al lado de cada párrafo, titular de relato o pie. Eso es relleno
  y lo cierra la constitución VIII.
- Un icono de relleno (fill) o un pack.
- Un tab, un radio, un `CopyField` o un camino de ayudar **sin** marca.
- Inventar un cuarto lugar para los SVG.

## Compuerta

`npm run check:iconos`. Si el campo nuevo no está en `COPY_FIELD_MARKS`, si
el selector de país perdió la bandera o si entró un `import` de un pack, el
verify falla. Un párrafo en esta Skill no alcanza.
