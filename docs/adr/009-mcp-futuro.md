# ADR-009 · `AgentCapabilityService` como frontera para un servidor MCP futuro

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

Más adelante el proyecto podría exponer un servidor MCP autónomo, para que un agente consulte el
estado de la campaña sin tener la página abierta. Hoy no hace falta, y el SDK v2 del protocolo es de
julio de 2026: la revisión `2026-07-28` es incompatible a nivel de cable en las dos direcciones con
todas las anteriores, y el repositorio del SDK está limitando contribuciones "mientras v2 se asienta".

Implementarlo ahora sería construir sobre algo que todavía se mueve. No dejar la frontera preparada
sería garantizar una reescritura.

## Decisión

Se **diseña** la frontera y **no** se implementa el servidor.

Cada capacidad se declara una vez, con nombre, descripción, esquema Zod de entrada, banderas de
lectura y una función `run`, sin saber nada de transporte. Los adaptadores son delgados:

| Adaptador | Estado | Diferencia |
|---|---|---|
| UI (Server Components) | Implementado | Llama `run` y usa el objeto |
| REST (`/api/public/*`) | Implementado | Valida, ejecuta, serializa |
| WebMCP | Implementado | `z.toJSONSchema(input)` como `inputSchema`; devuelve el valor |
| MCP | **No implementado** | `server.registerTool(name, config, handler)` con Standard Schema; envuelve en `{ content: [{ type: "text", text }] }` |

Las diferencias entre WebMCP y MCP son exactamente tres: cómo se registra, el formato del esquema y
la forma del retorno. Las tres viven en el adaptador; la lógica y la autorización son una sola.

Cuando se implemente, será con `@modelcontextprotocol/server@2`, no con `@modelcontextprotocol/sdk`,
que es la línea legacy v1.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Implementar el servidor MCP ahora | El protocolo cambió de forma incompatible hace seis semanas; no hay consumidor esperando |
| No preparar la frontera | Garantiza duplicar lógica y autorización después, que es la vulnerabilidad que la especificación de WebMCP nombra explícitamente |
| Acoplar las capacidades a Next Route Handlers | El servidor MCP no corre en Next; habría que extraerlas igual |
| Definir los esquemas en JSON Schema a mano | Zod da validación en runtime **y** genera JSON Schema con `z.toJSONSchema()`. Escribir los dos a mano los desincroniza |

## Consecuencias

**Buenas.** Agregar el servidor MCP será escribir un adaptador de unas cincuenta líneas más un punto
de entrada. La lógica ya está testeada por los otros tres adaptadores. Y hay un beneficio inmediato,
no sólo futuro: la UI y la API ya comparten un único camino de código, así que no pueden divergir.

**Malas y aceptadas.**

- Existe una capa que hoy tiene un solo tipo de consumidor real. Es la apuesta declarada del ADR-005.
- Zod 4 cambió su API de errores (`error.format()` salió; ahora es `z.treeifyError()`), y el SDK v2 de
  MCP depende de `zod ^4.2.0`. Coincide con la versión elegida, lo que es suerte y no diseño; queda
  anotado para cuando haya que actualizar.
