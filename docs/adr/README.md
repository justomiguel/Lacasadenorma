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
| [016](./016-totales-recibidos-agregados.md) | El total recibido viene de una vista agregada, no del detalle de aportes | Aceptada; enmendada por ADR-042 para el nombre con consentimiento |
| [017](./017-revalidacion.md) | Revalidación: ISR de cinco minutos más invalidación explícita al publicar | Aceptada |
| [018](./018-presupuestos-de-performance.md) | Los presupuestos de Lighthouse se fijan sobre lo medido, no sobre lo deseado | Aceptada |
| [019](./019-auditoria-por-funcion.md) | El rastro de auditoría se escribe por una función `security definer`, no por privilegio de tabla | Aceptada |
| [020](./020-rastro-obligatorio.md) | El rastro de auditoría es obligatorio en el tipo, no una convención | Aceptada |
| [021](./021-segunda-direccion-visual.md) | La fotografía como estructura: segunda dirección visual | Aceptada |
| [022](./022-medicion-de-performance.md) | Estrangular la red de verdad en lugar de simularla | Aceptada |
| [023](./023-i18n-estructural.md) | i18n estructural: castellano sin prefijo, inglés en `/en` | Aceptada |
| [024](./024-tercera-direccion-visual.md) | El color sale de la casa: tercera dirección visual y limpieza de contenido | Reemplazada por ADR-025 para la dirección de arte |
| [025](./025-mockup-aprobado.md) | El mockup aprobado es la fuente de verdad visual | Aceptada |
| [026](./026-jerarquia-y-capitulos.md) | Capítulos visibles, una sola clase de acción y las tres formas de ayudar en pestañas | Reemplazada por ADR-032 en jerarquía, acciones y previas |
| [027](./027-identidad-publica.md) | Una identidad, dos audiencias: `authenticated` deja de significar «de confianza» | Aceptada |
| [028](./028-correo-resend.md) | Correos de identidad por SMTP de Resend; los del producto, por un puerto propio | Aceptada |
| [029](./029-reserva-sin-sobreventa.md) | La reserva se decide con un contador y un CHECK, no leyendo antes de escribir | Aceptada |
| [030](./030-muro-por-privilegio-de-columna.md) | El muro se expone por privilegio de columna, y borrar la cuenta anonimiza | Aceptada |
| [031](./031-donacion-en-especie-no-es-plata.md) | Una donación en especie no entra en el libro | Aceptada |
| [032](./032-relato-mobile-editorial.md) | El relato mobile editorial: fotografía, aire y tres familias de acción | Aceptada |
| [033](./033-aprobacion-de-cuentas.md) | Una cuenta del público no reserva nada hasta que el equipo la habilita | Aceptada |
| [034](./034-editor-novedades.md) | El cuerpo de una novedad se edita a ojo y se guarda como árbol, no como HTML | Aceptada |
| [035](./035-simbolo-de-la-marca.md) | El símbolo de la marca es el círculo 01 ORIGINAL | Aceptada |
| [036](./036-tarjeta-de-compartir.md) | Al compartir se ve el símbolo y el texto de esa página | Aceptada; enmendada por ADR-038 para el artículo con portada |
| [037](./037-chrome-de-cuenta.md) | El chrome de cuenta no personaliza las páginas públicas | Aceptada |
| [038](./038-portada-de-novedad.md) | La portada de una novedad es el primer visual, también al compartir | Aceptada |
| [039](./039-oauth-nativo.md) | Alta con las redes sociales nativas de Supabase Auth | Aceptada |
| [040](./040-plata-publica-en-porcentaje.md) | En público la plata se habla en porcentajes, y el 100% no se publica | Aceptada; enmendada por ADR-042 para el porcentaje de un aporte en el muro |
| [042](./042-muro-de-aportes-con-porcentaje.md) | El muro de aportes publica el nombre, y el porcentaje sólo si se prende | Aceptada |
