---
name: iconos-en-la-interfaz
description: >-
  Poner un icono identificador ANTES del nombre, a 1.15em de esa letra, en
  cada control, campo, canal, camino o ítem de menú. Usar siempre que se
  toque app/, components/ o se agregue un botón, tab, radio, enlace o dato
  copiable.
---

# Iconos que identifican

Leé esto **antes** de tocar una pantalla. Si choca con
`.cursor/rules/trabajo.mdc` o con la constitución, ganan ellos. El detalle
de la transferencia está en `iconos-en-transferencia`. ADR-047 es la
decisión.

## Criterio (todo el sitio)

1. **Antes del nombre, en la misma línea.** El pictograma es el primer hijo
   del renglón que nombra la cosa. No después. No arriba como kicker. No al
   lado de un párrafo de relato.
2. **`1.15em` de esa letra.** Al menos el tamaño de la palabra, un poco más
   para que el trazo se lea igual que la capital. Lo envuelve
   `IdentifyingMark`. `BrandMark` y `CountryFlag` usan el mismo token.
3. **Identifica ≠ actúa.** Copiar, cerrar, menú y la flecha de la secundaria
   no van en `IdentifyingMark`: son `ICON_ACTION` o flecha después del texto.

No se espera a que alguien lo pida. No se deja «para después».

| Superficie | Marca | Dónde vive |
|---|---|---|
| Marca de terceros (PayPal, Brubank, WhatsApp…) | Logo antes del nombre, 1.15 em | `BrandLabel` / `BrandMark` |
| País (Argentina, Chile) | Bandera a esa altura, 3:2 | `CountryFlag` |
| Internacional / resto del mundo | Globo | `GlobeIcon` en `IdentifyingMark` |
| Dato bancario (Alias, CBU, titular…) | Pictograma de la etiqueta | `COPY_FIELD_MARKS` |
| Canal (traer, transferir, Mercado Pago, PayPal) | Caja, banco o `BrandLabel` | `cover.tsx` |
| Camino de `/ayudar` | Manos, billete, caja | `help-paths.tsx` |
| Llamar / escribir | Teléfono / sobre | `contact-actions.tsx` |
| Drawer (donaciones, cuenta, backoffice, métricas) | Caja, persona, grilla, gráfico | `account-chrome.tsx` |
| Salir (pie del menú de trabajo y del menú del teléfono) | Icono + nombre, fondo rojo | `sidebarSignOutClass` |
| Menú de trabajo (backoffice y `/cuenta`) | Pictograma del grupo | `work-nav.tsx` / `nav-bar.tsx` |
| Pestañas del backoffice (Campaña, Plata) | Pictograma de la sección | `group-tabs.tsx` |
| Pestañas de la cuenta (aparecer, acceso, borrar) | Pictograma de la pestaña | `account-settings.tsx` |
| Botón con caja (Ayudar, Ingresar, Mi Panel, envío, leer) | Pictograma antes del nombre | `HelpCta` / `PrimaryAction` / `SubmitButton` / `AccountChrome` |
| Acción (copiar, cerrar, menú, flecha) | 44 px / flecha después | `icons.tsx` + `ICON_ACTION` |

El nombre **no se reemplaza**. El icono es `aria-hidden`. Quien no reconoce
el pictograma sigue leyendo «CBU».

## De dónde salen

Una sola familia de trazo: `components/design-system/icons.tsx` (1.5, round,
viewBox 24, `currentColor`). El tamaño identificador es el token
`--identifying-mark: 1.15em`, no un `size={16}`. Las marcas de terceros van
en `content/brands.ts`. Las banderas, en `flags.tsx`.

Si falta un pictograma, **se agrega en `icons.tsx` y se envuelve con
`IdentifyingMark`**. No se importa Lucide, Heroicons, Tabler, Phosphor ni
`react-icons`. No se pega un SVG suelto. No hay emoji.

## Qué no hacer

- Un icono al lado de cada párrafo, titular de relato o pie. Eso es relleno
  y lo cierra la constitución VIII.
- Un icono de relleno (fill) o un pack.
- Un tab, un radio, un `CopyField`, un camino de ayudar o un **botón con caja**
  **sin** marca.
- Un `size={16}` o un `1.15em` escrito a mano en el componente.
- Inventar un cuarto lugar para los SVG.

## Compuerta

`npm run check:iconos`. Si el campo nuevo no está en `COPY_FIELD_MARKS`, si
falta `IdentifyingMark`, si un botón con caja no tiene marca, si hay
`size={16}` o si entró un pack, el verify falla. Un párrafo en esta Skill
no alcanza.
