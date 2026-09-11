# ADR-008 · WebMCP en un archivo aislado, con herramientas de sólo lectura

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

El objetivo es que el sitio sea utilizable por agentes desde su primera versión. El estado real de la
especificación, verificado el 2026-09-09:

- Es un **Draft Community Group Report** del W3C, no un estándar.
- **Un solo motor** la implementa (Chromium). Origin trial en Chrome 149–156, envío propuesto para
  157 sin garantía.
- **WebKit está formalmente en contra** y anunció que presentaría objeción formal si se aprueba el
  cambio de charter. La revisión del TAG está incompleta.
- La API tuvo **dos renombres con ruptura en 2026**: `navigator.modelContext` →
  `document.modelContext`, y `provideContext({tools})` → `registerTool(tool)`.
- **`requestUserInteraction()` fue eliminado.** No existe hoy primitiva de confirmación humana.
- **Ningún agente de consumo masivo descubre herramientas WebMCP** todavía.

## Decisión

Se implementa, con tres restricciones duras.

1. **Todo el código WebMCP en un solo archivo**, detrás de feature detection, sin dependencias. Si la
   especificación cambia otra vez, se edita un archivo.
2. **Sólo herramientas de lectura.** Las cinco declaran `readOnlyHint: true`. Ninguna inicia,
   confirma ni facilita una operación financiera. Esto no es cautela genérica: **es consecuencia
   directa de que no exista primitiva de confirmación humana en la especificación**.
3. **Tipos propios** (~30 líneas de declaración ambiente), no un paquete.

La lógica vive en `AgentCapabilityService` (ADR-009). El archivo de WebMCP sólo registra y traduce.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| No implementar WebMCP | El costo es bajo y prepara el terreno; el requisito es explícito |
| Instalar el polyfill `@mcp-b/global` | Hacer que `document.modelContext` exista en JS **no** hace que ningún agente descubra las herramientas: el descubrimiento lo media el navegador. Suma dependencia sin sumar alcance |
| Usar los tipos `@mcp-b/webmcp-types` | En 5.1.0 van atrasados: falta `consequentialHint` y `execute` está tipado sin el argumento `{ signal }` |
| El paquete npm `webmcp` | Es un stub abandonado: v0.0.1, febrero de 2025, sin repositorio |
| Exponer una herramienta que prellene el formulario de aporte | Sería defendible, pero acerca un agente a una operación de dinero sin ganancia real. Se descarta hasta que exista confirmación humana en la especificación |
| Usar la API declarativa | Menos madura que la imperativa; el evento `toolactivated` todavía no está especificado |

## Consecuencias

**Buenas.** El sitio queda listo para agentes con una superficie de riesgo mínima. La lógica es
reutilizable por el futuro servidor MCP sin tocarla. Si la especificación vuelve a romper, el
impacto es un archivo.

**Malas y aceptadas.**

- Es probable que la API cambie otra vez. Se asume conscientemente.
- Hoy no hay beneficio medible en tráfico. Se implementa por preparación, y eso está declarado en
  lugar de disimulado.
- El retorno de `execute` **no** es `{ content: [...] }` (esa es la forma de MCP, un error frecuente):
  el navegador serializa lo que se devuelva. Queda documentado en el archivo.
- WebMCP se desactiva si el documento envía `Origin-Agent-Cluster: ?0`. No se envía, y hay un
  comentario en la configuración de headers para que nadie lo agregue por costumbre.
