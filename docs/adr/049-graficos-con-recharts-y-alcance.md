# ADR-049 · Gráficos con Recharts y alcance leído del proveedor

**Estado**: Aceptada · **Fecha**: 2026-09-16

Enmienda ADR-048 (gráficos SVG propios; analítica de visitas fuera del tablero).
No enmienda ADR-010: las visitas **no** se copian a Postgres.
Enmienda de 2026-09-16: el alcance suma navegadores, páginas de entrada, desgloses de
propiedades de ADR-010 y tasas contra visitantes (FR-616). El pulso de novedad y de aporte
a catorce días vive en el dominio del libro (FR-617), no en el proveedor.

## Contexto

El tablero del owner (ADR-048) dibujaba SVG a mano y dejaba las visitas en el proveedor. El
pedido de producto cambió en dos puntos: usar una librería de gráficos, y mostrar en el mismo
tablero lo que todo sitio mide —vistas, procedencia, dispositivos, eventos de intención—.

Tres tensiones que ya estaban escritas:

1. La constitución pide justificar cada dependencia contra escribir el código, y prohíbe
   librerías de **componentes visuales**. Una librería de charts no es un kit de UI; igual
   hay que justificarla.
2. ADR-010 descartó guardar visitas en Postgres: escribe en cada hit y mezcla alcance con el
   libro. Un iframe al panel del proveedor mezcla dos privilegios en la misma pantalla.
3. Un cero inventado sigue prohibido. Sin proveedor, el tablero no puede fingir visitas.

## Decisión

1. **Los gráficos se dibujan con Recharts 3**, en un componente cliente, con los tokens del
   tema. La tabla de las mismas cifras **sigue** al pie (WCAG 1.4.1, FR-605). No hay zoom de
   producto ni cromo de SaaS: ejes, barras, una línea de señal cuando el dominio ya la calculó.
   `"use client"` se justifica por el hover del dato, que el SVG propio no tenía.
2. **El alcance se lee del Stats API del proveedor**, en el servidor, con
   `ANALYTICS_API_KEY`. El dominio del sitio es el mismo `NEXT_PUBLIC_ANALYTICS_DOMAIN` del
   script. El origen de la API se deriva de `NEXT_PUBLIC_ANALYTICS_SCRIPT_URL` o se fija con
   `ANALYTICS_API_URL`. El contrato es el de Plausible (`POST /api/v2/query`); cambiar de
   proveedor compatible es cambiar variables, no el dominio.
3. **Nada de eso se escribe en Postgres.** El snapshot de alcance vive en memoria el tiempo
   de armar la página. Los eventos de ADR-010 aparecen como **totales** que el proveedor ya
   agregó (`ayudar_click`, `dato_copiado`, …), no como filas propias.
4. **Sin clave, o si la lectura falla, la sección se omite.** Se dice por qué. No se dibuja
   un 0 de visitas. Un fallo de alcance **no** tumba el libro: son dos fuentes.

La lista de lo medible en alcance: visitantes y vistas de los últimos treinta días, serie
diaria, rebote, duración media, páginas, fuentes, dispositivos, navegadores, páginas de
entrada, países, los eventos semánticos de ADR-010, y desgloses de las propiedades que esos
eventos ya emiten (`origen`, `campo`, `canal`, `medio`). Las tasas de intención se calculan
contra visitantes y se omiten sin denominador. No hay recorridos por persona, ni UTM, ni
comparación con el período anterior: eso se agrega el día que haya una pregunta que no
respondan estas dimensiones.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir con SVG propio | El pedido pide librería. El SVG propio no tenía hover ni escala |
| Chart.js / canvas | El dato deja de estar en el árbol; la tabla tendría que cargar sola toda la a11y |
| visx | Más API para el mismo dibujo. Recharts cubre barras, series y línea de referencia |
| Guardar pageviews en Postgres | ADR-010: latencia en cada visita y mezcla con el libro |
| iframe al panel de Plausible | Dos privilegios, dos CSPs, y el owner ya está autenticado acá |
| Umami como contrato del reader | El script ya habla el contrato de Plausible. Un segundo reader se agrega el día que el script deje de ser ése |

## Consecuencias

**Buenas.** El tablero habla de plata y de alcance en una pantalla. La dependencia está
pinneada. ADR-010 se cumple: no hay cookie nueva ni tabla de visitas.

**Malas y aceptadas.**

- Recharts entra al `package.json` y al bundle del backoffice. No al sitio público: el
  componente cliente vive bajo `components/admin/`.
- Hace falta una clave de API además del script público. Sin ella el sitio puede estar
  midiendo y el tablero no puede leerlo: hay una señal que lo dice.
- El hover no existe con movimiento reducido: Recharts respeta `prefers-reduced-motion` en
  las transiciones; la tabla sigue siendo la fuente.
