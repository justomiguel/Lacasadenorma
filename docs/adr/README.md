# Architecture Decision Records

Cada decisión que sería costosa de revertir vive acá, con su contexto, las alternativas que se
descartaron y sus consecuencias — incluidas las malas.

Regla operativa (constitución, principio I): **si una decisión importante no está en una spec, un
plan, un ADR o una task antes de implementarse, el trabajo se detiene y se documenta primero.**

Formato: contexto → decisión → alternativas descartadas → consecuencias. Estados posibles:
`Aceptada`, `Reemplazada por ADR-NNN`, `Obsoleta`.

| # | Decisión | Estado |
|---|---|---|
| [001](./001-framework.md) | Next.js 16 con App Router, y versiones fijadas por compatibilidad real | Aceptada |
| [002](./002-supabase.md) | Supabase como base de datos, autenticación y almacenamiento | Aceptada |
| [003](./003-autenticacion.md) | Supabase Auth con verificación por claims | Aceptada |
| [004](./004-rbac.md) | RBAC con tabla de roles más claim en el token | Aceptada |
| [005](./005-arquitectura-capas.md) | Cuatro capas con dependencias unidireccionales, y cinco patrones justificados | Aceptada |
| [006](./006-aportes.md) | Aportes por transferencia registrados manualmente, con puerto abierto a medios electrónicos | Aceptada |
| [007](./007-arquitectura-contenido.md) | Contenido dividido por frecuencia de cambio: repositorio y base de datos | Aceptada |
| [008](./008-webmcp.md) | WebMCP en un archivo aislado, con herramientas de sólo lectura | Aceptada |
| [009](./009-mcp-futuro.md) | `AgentCapabilityService` como frontera para un servidor MCP futuro | Aceptada |
| [010](./010-analytics-privacidad.md) | Analítica sin cookies ni identificación personal | Aceptada |
| [011](./011-cache-components.md) | No habilitar `cacheComponents` en esta versión | Aceptada |
| [012](./012-design-system.md) | Sistema de diseño propio sobre tokens de Tailwind 4 | Aceptada |
| [013](./013-base-datos-local.md) | Desarrollo y testing de base de datos sin Docker | Aceptada |
| [014](./014-idioma.md) | Castellano para producto y documentación, inglés para el código | Aceptada |
| [015](./015-fixture-de-desarrollo.md) | Un fixture de desarrollo, separado y explícito | Aceptada |
| [016](./016-totales-recibidos-agregados.md) | El total recibido viene de una vista agregada, no del detalle de aportes | Aceptada |
| [017](./017-revalidacion.md) | Revalidación: ISR de cinco minutos más invalidación explícita al publicar | Aceptada |
| [018](./018-presupuestos-de-performance.md) | Los presupuestos de Lighthouse se fijan sobre lo medido, no sobre lo deseado | Aceptada |
| [019](./019-auditoria-por-funcion.md) | El rastro de auditoría se escribe por una función `security definer`, no por privilegio de tabla | Aceptada |
