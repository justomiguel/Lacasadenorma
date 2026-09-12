# La Casa de Norma — Análisis inicial

> Documento previo a cualquier línea de código. Es el entregable exigido por el punto 35 del
> brief y la entrada de la fase *Research* del ciclo Spec-Driven Development.
>
> **Fecha:** 2026-09-09 · **Estado:** propuesta para revisión · **Autor:** equipo de ingeniería

---

## 1. Análisis del problema

### 1.1 Qué se está construyendo, en una frase

Un sitio público que permita a una persona que llega desde WhatsApp, con una conexión móvil
mediocre y treinta segundos de atención, entender quién fue Norma, qué pasó, qué se necesita,
cómo colaborar y cómo verificar en qué se usó cada peso; construido sobre una base técnica que
más adelante sostenga a Fundación Norma sin reescribirse.

### 1.2 El problema real no es técnico, es de confianza

Una campaña de reconstrucción familiar compite contra una sospecha razonable y muy extendida:
*"¿esto es real y la plata llega a donde dicen?"*. Esa sospecha no se resuelve con diseño lindo
ni con copy emotivo. Se resuelve con:

1. **Evidencia verificable**: montos, gastos, comprobantes, fechas, fotos del avance.
2. **Trazabilidad**: cada peso ingresado y cada peso gastado tienen fecha, categoría y respaldo.
3. **Actualización sostenida**: una página de transparencia congelada hace tres meses genera más
   desconfianza que no tenerla.
4. **Datos bancarios fáciles de copiar y sin fricción**, porque la fricción se lee como excusa.

De ahí se sigue una consecuencia de arquitectura que ordena todo el resto: **el modelo de datos
de transparencia es el núcleo del producto, no un anexo**. La home es una vista de ese núcleo.

### 1.3 Restricciones reales del contexto

| Restricción | Consecuencia de diseño |
|---|---|
| El tráfico llega de WhatsApp, Instagram, Facebook y LinkedIn | Mobile-first no negociable; OpenGraph impecable; primer render rápido en 4G |
| Riacho He Hé (Formosa) tiene conectividad limitada | Presupuesto de performance agresivo; contenido crítico en HTML servido, no en JS |
| Quien va a cargar el contenido no es developer | Backoffice simple, en castellano, sin jerga; nunca "editá este JSON" |
| Aportes por transferencia bancaria en AR, CL y US | La contribución **no** se procesa en el sitio: se registra manualmente y se concilia. El sitio informa y da trazabilidad |
| No hay equipo: hay una persona y agentes | Todo lo que no esté automatizado (tests, CI, lint) se degrada. La automatización es supervivencia, no lujo |
| El proyecto tiene que sobrevivir años | Especificaciones y ADRs como fuente de verdad; el código es consecuencia |

### 1.4 Qué haría fracasar el proyecto

Ordenado por probabilidad, no por gravedad:

1. **Que la transparencia quede vacía.** Es el trabajo humano recurrente más costoso y el que
   nadie controla. Mitigación: backoffice diseñado para cargas de dos minutos desde el teléfono.
2. **Que parezca hecho por una IA.** Destruye la confianza más rápido que un bug. Mitigación:
   sistema de diseño editorial propio, fotografía real con protagonismo, copy escrito a mano,
   lista explícita de anti-patrones visuales prohibidos en la constitución.
3. **Que se filtre información privada** (comprobantes con datos de terceros, montos con nombres
   de donantes). Mitigación: RLS desde la primera migración, separación estricta público/privado,
   nada de `service_role` en el navegador.
4. **Que la deuda técnica del "MVP apurado" bloquee la Fundación.** Mitigación: capas separadas
   desde el día uno y `AgentCapabilityService` como frontera reutilizable.
5. **Que el sitio quede desactualizado porque publicar cuesta.** Mitigación: modelo de contenido
   editable + Realtime innecesario descartado + revalidación por etiquetas.

---

## 2. Stack final propuesto

### 2.1 Advertencia importante: `latest` no es instalable

La investigación previa (ver `docs/research/`) verificó empíricamente que **las versiones
`latest` del ecosistema son mutuamente incompatibles hoy**. Esto no es una opinión, se reprodujo
instalando y ejecutando:

| Paquete | `latest` en npm | Qué pasa si se usa | Versión elegida |
|---|---|---|---|
| `typescript` | `7.0.2` | TS 7 es el port nativo en Go y **no expone la API de compilador en JS**. `typescript-eslint` aborta: *"typescript-eslint does not support TS 7.0"* | **`6.0.3`** como módulo, y TS 7 como alias `tsgo` sólo para el binario `tsc` (typecheck ~6× más rápido) |
| `eslint` | `10.10.0` | `eslint-plugin-react@7.37.5` y `eslint-plugin-import` topean en `^9`; el lint muere con `contextOrFilename.getFilename is not a function` | **`9.39.5`** |
| `next` | `16.3.4` | Correcto, pero con rupturas importantes respecto de Next 14/15 | **`16.3.4`** |

Regla que queda en la constitución: **antes de fijar una dependencia se verifican sus
`peerDependencies`, no su tag `latest`.**

### 2.2 Stack

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 16.3.4** (App Router, Turbopack por defecto) | Server Components permiten enviar el contenido crítico como HTML sin JS de cliente, que es exactamente el requisito de performance |
| UI | **React 19.3.0** | Peer de Next 16 |
| Lenguaje | **TypeScript 6.0.3** en modo `strict` + `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `noUnusedLocals` | Estricto de verdad, no `strict: true` decorativo |
| Estilos | **Tailwind CSS 4.3** con configuración CSS-first (`@theme`) | Los design tokens se declaran como custom properties CSS y Tailwind genera las utilidades. Es el mejor vehículo para un sistema propio: los tokens *son* la API, y quedan disponibles también para CSS a mano |
| Componentes | **Ninguna librería de componentes** | Requisito explícito: identidad propia, no clon de shadcn/ui. Primitives accesibles a mano, auditadas con axe |
| Datos | **Supabase** (PostgreSQL 16, Auth, Storage) | Postgres real con RLS, auth gestionada y storage en un solo proveedor; migraciones versionadas en el repo |
| Validación | **Zod 4.6** | Un esquema sirve simultáneamente para validar en servidor y para generar JSON Schema de las herramientas WebMCP (`z.toJSONSchema`) |
| Tests | **Vitest 5** + Testing Library 16.3 + **Playwright 1.63** + `@axe-core/playwright` | Pirámide completa; axe integrado en E2E |
| Base de datos local | **PostgreSQL 16 de apt + pgTAP**, sin Docker | Docker no está disponible en el entorno de agentes. `supabase migration up --db-url` y `supabase db advisors --db-url` funcionan sin contenedores; `pgTAP` corre por `psql`. Las policies RLS se testean de verdad, no se mockean |
| Lint / formato | ESLint 9.39.5 (flat config, type-aware) + Prettier 3.9 | |
| CI | GitHub Actions | `ci.yml`, `e2e.yml`, `quality.yml`, `db.yml` |
| Hosting | Vercel | Preview por PR, producción en `main` |

### 2.3 Decisiones deliberadas de *no* incluir

| Descartado | Motivo |
|---|---|
| `cacheComponents` de Next 16 (PPR + `use cache`) | Obliga a envolver todo acceso a datos de request en `<Suspense>` o el build falla. Complejidad alta para un sitio casi estático. Se documenta como ADR y se reevalúa cuando exista tráfico real |
| CMS externo (Sanity, Contentful, Payload) | Un CMS para nueve páginas es sobrearquitectura, y agrega un proveedor más que puede fallar o cobrar |
| Realtime de Supabase | No hay ningún caso donde el usuario necesite ver un cambio en vivo. Se descarta hasta que exista |
| Procesamiento de pagos en el sitio (Stripe / Mercado Pago) | Alcance inicial: transferencia bancaria. La arquitectura deja el puerto abierto (`PaymentMethod` como entidad, no como constante) |
| Servidor MCP autónomo | Se diseña la frontera, no se implementa. El SDK v2 de MCP es de julio 2026 y todavía es joven |
| `llms-full.txt` | No existe en la especificación de llms.txt (ni v1 ni v2). Se descarta |
| `ai.txt`, header `Content-Usage` | Borradores IETF sin consumo real (0,1% de adopción). Se descartan |
| Analytics con cookies (GA4) | Innecesario para las preguntas que hay que responder, y hostil a la privacidad |

---

## 3. Harness: qué se instaló y por qué

Principio aplicado: **instalar sólo lo que aporta valor verificable, preferir oficial o
activamente mantenido, documentar el motivo.**

### 3.1 Instalado

| Herramienta | Versión | Por qué se eligió | Evidencia |
|---|---|---|---|
| **GitHub Spec Kit** (`specify-cli`) | 1.0.5 | Es el requisito central del brief: el flujo SDD completo con plantillas, gates de constitución y `converge`. Oficial de GitHub | `specify --version` → 1.0.5 |
| **Supabase Agent Skills** (`supabase`, `supabase-postgres-best-practices`) | 0.1.2 / 36 referencias | Oficiales de Supabase. La skill `supabase` trae un checklist de seguridad que codifica trampas reales: `user_metadata` es editable por el usuario y no sirve para autorizar; las vistas *bypassean* RLS salvo `security_invoker = true`; un `UPDATE` sin policy de `SELECT` devuelve 0 filas en silencio; `TO authenticated` sin predicado de propiedad es IDOR. Nada de eso está en mi conocimiento base con esa precisión | `.agents/skills/` (commiteado) |
| **PostgreSQL 16.15 + pgTAP 1.3.2 + plpgsql_check 2.7.2** | apt | Permite testear RLS de verdad sin Docker. Sin esto, las policies quedarían sin verificar hasta producción, que es exactamente donde no se quiere descubrir un fallo de autorización | `psql --version`, extensiones presentes |
| **Supabase CLI** | 2.117.0 (devDependency) | `migration new` genera nombres de archivo correctos; `migration up --db-url` y `db advisors --db-url` corren sin Docker. `db advisors` es el linter real de seguridad y performance de RLS | verificado en la investigación |
| **`frontend-design`** (`anthropics/skills`) | instalada el 2026-09-11 | Oficial de Anthropic. Se agregó cuando la familia dijo que el sitio se veía monótono, y sirvió para lo contrario de lo que uno espera de una skill de diseño: no propuso nada, **diagnosticó**. Su sección de calibración enumera los grupos estéticos donde se agrupa el diseño generado por IA, y el sitio caía en cuatro a la vez —crema y terracota con display serif, layout de broadsheet con reglas de un pixel, sobrelínea en VERSALES arriba de cada encabezado, metadatos unidos con puntos medios—. Los tres criterios que más pesaron no están en mi conocimiento base con esa precisión: que las versales en las etiquetas y las etiquetas que sólo anuncian el título son delatores, y que la audacia se gasta en un solo lugar por pantalla. Ver [ADR-021](./adr/021-segunda-direccion-visual.md) | `.agents/skills/frontend-design/`, `skills-lock.json` (commiteados) |

### 3.2 Evaluado y descartado

| Herramienta | Motivo del descarte |
|---|---|
| **Supabase MCP Server** (`https://mcp.supabase.com/mcp`) | Requiere OAuth 2.1 en navegador o un PAT. No hay credenciales del proyecto en este entorno. Se documenta como harness opcional de desarrollo en `docs/deployment.md`, con la configuración lista |
| **`supabase-community/supabase-plugin`** | Empaqueta las skills *y* el MCP; el MCP necesita credenciales. Se instalaron las skills sueltas, que es la parte útil hoy |
| **Polyfill `@mcp-b/global`** y tipos `@mcp-b/webmcp-types` | El polyfill no consigue que ningún agente descubra las herramientas: el descubrimiento lo media el navegador. Y `@mcp-b/webmcp-types@5.1.0` va atrasado respecto de la especificación (le falta `consequentialHint`, y `execute` está tipado sin el argumento `{ signal }`). Se escriben ~30 líneas de declaración ambiente propias, sin dependencia |
| **Paquete npm `webmcp`** | Es un stub abandonado: v0.0.1, publicado en febrero de 2025, sin repositorio |
| **`embedded-postgres`** | Funciona, pero no trae pgTAP ni plpgsql_check y empaqueta Postgres 18, que diverge de la versión de Supabase. Peor herramienta para el mismo trabajo |
| **Extensión `agent-context` de Spec Kit** | Regenera archivos tipo `AGENTS.md`; el valor es marginal frente a mantener `AGENTS.md` a mano y bien |
| **Extensión `taskstoissues`** | Las notas de la release 1.0.5 anuncian que sale del core |
| **`brand-guidelines`** (`anthropics/skills`) | Aplica la identidad de marca **de Anthropic**: su paleta y su tipografía. Acá sería activamente dañino, porque el acento de Anthropic es la terracota que ADR-021 identificó como parte del problema |
| **`theme-factory`** (`anthropics/skills`) | Diez temas preajustados de color y tipografía. Contradice ADR-012 en su premisa: los tokens de este proyecto son propios y vienen del lugar, no de un catálogo |
| **`webapp-testing`** (`anthropics/skills`) | Es la que más se parecía a lo que hacía falta —revisión por capturas—, y se descartó porque escribe Playwright en **Python**. El proyecto ya tiene Playwright en TypeScript, `scripts/screenshots.mjs` y `e2e/comun/revision-visual.spec.ts`: sería una segunda cadena de herramientas para un trabajo que ya está cubierto. Lo que faltaba no era la herramienta, era mirar las capturas |
| **`canvas-design`** (`anthropics/skills`) | Produce `.png` y `.pdf`: afiches y piezas gráficas, no interfaz web. Fuera de alcance |
| **Colecciones de terceros** (`Impeccable`, `ui-ux-pro`, `frontend-design-flow`) | Son las alternativas más ricas y las tres se descartaron por el mismo motivo: redistribuyen skills de otros con licencias mezcladas, y las que revisé asumen Tailwind por defecto más `shadcn/ui`, que es exactamente lo que la constitución prohíbe y lo que ADR-012 se tomó el trabajo de desarmar. Una skill que empuja hacia el default no sirve en un proyecto cuyo problema es el default |

### 3.3 Correcciones a premisas del brief (importante)

La investigación desmintió cinco supuestos del brief. Construir sobre ellos habría producido
código que no funciona:

1. **`navigator.modelContext.provideContext({ tools })` ya no existe.** El punto de entrada es
   `document.modelContext` y el registro es `registerTool(tool, { signal })`, de a una
   herramienta. `provideContext`, `clearContext` y `unregisterTool` fueron eliminados.
2. **`{ content: [{ type: "text", text }] }` es la forma de retorno de MCP, no de WebMCP.** En
   WebMCP `execute` devuelve `Promise<any>` y el navegador serializa a JSON.
3. **`requestUserInteraction()` no está en la especificación** (se eliminó). No existe hoy
   primitiva de human-in-the-loop en WebMCP; por eso ninguna herramienta que mueva dinero puede
   existir en este sitio.
4. **`@modelcontextprotocol/sdk` es la línea legacy v1.** La actual es v2:
   `@modelcontextprotocol/server` 2.0.0, con la revisión `2026-07-28` del protocolo.
5. **Los rich results de `FAQPage` desaparecieron de Google el 7 de mayo de 2026**, incluida la
   excepción para salud y gobierno. El markup sigue siendo válido pero no gana nada.

Y una corrección al flujo de Spec Kit: en 1.0.5 **no existe la flag `--ai`** ni el agente
`cursor`. Es `--integration cursor-agent`.

---

## 4. Arquitectura propuesta

### 4.1 Capas

Cuatro capas con dependencias en una sola dirección. La regla que las hace reales: **`domain` no
importa nada de `infrastructure`, `presentation` no importa nada de `persistence`.**

```
┌─────────────────────────────────────────────────────────────────────┐
│ presentation        app/ (Server Components, rutas, metadata)       │
│                     components/ (design system + secciones)         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  llama casos de uso, nunca al ORM
┌───────────────────────────────▼─────────────────────────────────────┐
│ application         src/application/                                │
│                     casos de uso + AgentCapabilityService            │
│                     (única frontera que comparten UI, API, WebMCP)   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  depende de puertos (interfaces)
┌───────────────────────────────▼─────────────────────────────────────┐
│ domain              src/domain/                                      │
│                     entidades, value objects (Money, Percentage),    │
│                     reglas (cálculo de saldo, % ejecutado), puertos  │
│                     CERO imports de Next, Supabase o React           │
└───────────────────────────────▲─────────────────────────────────────┘
                                │  implementa los puertos
┌───────────────────────────────┴─────────────────────────────────────┐
│ infrastructure      src/infrastructure/                              │
│                     repositorios Supabase, repositorios de archivos, │
│                     clientes, logger, analytics                      │
├──────────────────────────────────────────────────────────────────────┤
│ persistence         supabase/migrations/ (SQL versionado + RLS)       │
│                     content/ (contenido editorial versionado)         │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Los cuatro adaptadores comparten un solo núcleo

Esto es lo que hace que la Fundación no requiera reescritura:

```
                    ┌──────────────────────────┐
                    │  AgentCapabilityService  │
                    │  (capacidades tipadas    │
                    │   con esquema Zod)       │
                    └────────────┬─────────────┘
        ┌────────────┬───────────┼───────────┬──────────────┐
        ▼            ▼           ▼           ▼              ▼
    Web UI      REST /api    WebMCP      MCP server    Futuro: bot
   (RSC)        (público)   (browser)    (no ahora)     WhatsApp
```

Cada capacidad se declara una sola vez con `name`, `description`, esquema Zod de entrada,
flags `readOnly` / `consequential`, y una función `run`. Los adaptadores son de ~50 líneas:

- **WebMCP**: `z.toJSONSchema(input)` → `inputSchema`; devuelve el valor tal cual.
- **REST**: valida, ejecuta, serializa.
- **MCP futuro**: envuelve en `{ content: [{ type: "text", text }] }`.

### 4.3 Patrones de diseño, y por qué cada uno

Sin patrones ceremoniales. Cada uno responde a un problema identificado:

| Patrón | Problema real que resuelve |
|---|---|
| **Repository** | Los tests de dominio y de casos de uso no pueden depender de una base de datos. Los puertos permiten repositorios en memoria en tests y Supabase en producción |
| **Service Layer** (casos de uso) | Cuatro adaptadores (UI, REST, WebMCP, MCP) necesitan la misma lógica con la misma autorización. Sin esta capa, se duplicaría, y la divergencia entre "el botón" y "la herramienta del agente" es la vulnerabilidad que la especificación de WebMCP nombra explícitamente |
| **Adapter** | Aislar la inestabilidad de WebMCP en un archivo desechable. La API ya tuvo dos renombres con ruptura en 2026 |
| **Strategy** | Cada método de aporte (transferencia AR, CL, US, y en el futuro Mercado Pago o Stripe) tiene datos e instrucciones distintas pero se renderiza con el mismo contrato |
| **Value Object** (`Money`, `Percentage`) | Los montos en centavos con moneda evitan la clase entera de bugs de floats y de sumar pesos con dólares |

**No** se usan: Factory (no hay familias de objetos que justifiquen la indirección), CQRS,
Event Sourcing, DI container.

### 4.4 Fronteras de seguridad

```
Navegador  ──HTTPS──►  Vercel Edge (CSP, HSTS, headers)
                          │
                          ├─ Rutas públicas ──► Supabase con clave publishable  ──► RLS: sólo publicado
                          │
                          └─ /admin ──► proxy.ts (redirect optimista)
                                          └─► verificación real en cada acción (getClaims)
                                                └─► Supabase con clave publishable + JWT del usuario
                                                      └─► RLS: según rol en app_metadata
```

Tres reglas que no se negocian: la clave secreta nunca sale del servidor y jamás se usa en el
navegador; `proxy.ts` **no es** frontera de seguridad (CVE-2025-29927), sólo redirige; toda
mutación revalida identidad y permisos del lado servidor.

---

## 5. Mapa de features

Prioridades: **P1** = sin esto el sitio no cumple su función. **P2** = necesario para sostener la
confianza en el tiempo. **P3** = habilita el capítulo siguiente.

| # | Feature | Prio | Alcance inicial |
|---|---|---|---|
| F1 | **Home** que explica todo en menos de 30 segundos | P1 | Hero, quién fue Norma, qué pasó, qué se necesita, progreso, cómo ayudar, transparencia resumida, futuro |
| F2 | **Cómo ayudar**: transferencias AR / CL / US | P1 | Datos por país, copiar al portapapeles en un toque, instrucciones claras, sin pasos innecesarios |
| F3 | **Historia de Norma** | P1 | Relato humano, fotografía con protagonismo |
| F4 | **Qué ocurrió** | P1 | El accidente, con respeto y sin sensacionalismo |
| F5 | **La reconstrucción** | P1 | Qué se perdió, qué hay que reparar, presupuesto por rubro, avance, hitos, fotos |
| F6 | **Transparencia pública** | P1 | Ingresos, gastos, saldo, % ejecutado, comprobantes, fechas, última conciliación |
| F7 | **Compartir** | P1 | OpenGraph optimizado para WhatsApp; botón nativo de compartir |
| F8 | **SEO / AEO** | P1 | Metadata por página, sitemap, robots, JSON-LD honesto, respuestas explícitas a las nueve preguntas |
| F9 | **Backoffice `/admin`** | P2 | Login, cargar aportes, gastos con comprobante, avances, fotos, hitos, cuentas bancarias, objetivos |
| F10 | **RBAC** | P2 | `owner`, `admin`, `editor`, `auditor` |
| F11 | **Actualizaciones** | P2 | Publicaciones fechadas y compartibles individualmente |
| F12 | **Herramientas WebMCP de sólo lectura** | P2 | 5 herramientas; ninguna mueve dinero |
| F13 | **Analytics respetuoso de la privacidad** | P2 | Eventos semánticos sin cookies ni identificación personal |
| F14 | **Legales** | P2 | Privacidad, términos |
| F15 | **El legado / Fundación Norma** | P3 | Qué sigue después de la casa |
| F16 | **Riacho Conecta** | P3 | Programa de formación, con anotación de interés |
| F17 | **Servidor MCP autónomo** | P3 | Sólo arquitectura documentada |
| F18 | **Mercado Pago / Stripe / PayPal** | P3 | Sólo puerto abierto en el modelo |

---

## 6. Riesgos

Ordenados por *riesgo esperado* (probabilidad × impacto), no por gravedad aislada.

| # | Riesgo | Prob. | Impacto | Mitigación concreta |
|---|---|---|---|---|
| R1 | La transparencia se desactualiza y la confianza se cae | Alta | Alto | Backoffice pensado para cargar en dos minutos desde el teléfono; campo `última conciliación` visible en la página, que hace evidente el atraso; runbook de conciliación semanal |
| R2 | El sitio "se siente hecho por IA" | Media | Alto | Anti-patrones prohibidos en la constitución; sistema de diseño editorial propio; loop de revisión visual con capturas desktop y mobile; fotografía real obligatoria antes del lanzamiento |
| R3 | Fuga de datos privados (comprobantes, donantes) | Baja | Muy alto | RLS en la primera migración; tests pgTAP que fallan si una policy es permisiva; bucket privado para comprobantes; el modelo público expone montos agregados, nunca identidades salvo consentimiento explícito |
| R4 | Contenido de ejemplo llega a producción como si fuera real | **Alta** | Muy alto | Todo dato no verificado se marca `pendiente` y **se oculta en lugar de inventarse**; `docs/content-guide.md` lista campo por campo qué falta cargar; test que falla si el sitio muestra el placeholder de monto en producción |
| R5 | WebMCP cambia otra vez y rompe el build | Media | Bajo | Todo el código WebMCP en un archivo, detrás de feature detection, sin dependencias. Si cambia, se edita un archivo |
| R6 | Abuso de agentes / prompt injection | Media | Medio | Sólo herramientas de lectura; `readOnlyHint: true`; validación server-side siempre; ninguna herramienta que inicie un pago; sin datos personales en las respuestas |
| R7 | Migración destructiva aplicada en producción | Baja | Muy alto | Migraciones versionadas, `db push --dry-run` obligatorio antes del push real, `concurrency` en el workflow, rollback documentado |
| R8 | Regresión de performance por una foto sin optimizar | Alta | Medio | Presupuestos de performance en CI; Lighthouse en `quality.yml`; `next/image` obligatorio |
| R9 | Se agotan las credenciales/entorno y el proyecto no despliega | Media | Medio | `.env.example` completo; `docs/deployment.md` paso a paso; el sitio funciona sin Supabase configurado (degrada a contenido versionado en el repo) |
| R10 | El proyecto se vuelve inmantenible al crecer hacia la Fundación | Media | Alto | Capas + ADRs + specs; `AgentCapabilityService` como única frontera agentic |

**R4 merece énfasis.** El riesgo más probable de este proyecto es que datos de ejemplo — un monto
recaudado inventado, un CBU falso, una fecha aproximada — terminen publicados y alguien
transfiera a una cuenta que no existe. La regla que se adopta: **el sistema prefiere no mostrar
nada antes que mostrar algo inventado.** Cada campo sin dato real se marca explícitamente y la UI
lo omite.

---

## 7. Estrategia de testing

Pirámide, con la proporción invertida respecto de lo habitual en el nivel de integración: acá lo
que puede lastimar a alguien son las policies RLS y los números de transparencia.

| Nivel | Herramienta | Qué cubre | Cantidad esperada |
|---|---|---|---|
| **Unit** | Vitest | Dominio puro: `Money` (no suma monedas distintas), `Percentage` (clamp 0–100), cálculo de saldo y de % ejecutado, formateo es-AR, parseo del contenido con Zod | La mayoría |
| **Component** | Vitest + Testing Library | Primitives del design system, copiar-al-portapapeles, estados de error, foco visible, jerarquía de encabezados | Media |
| **Integración (datos)** | **pgTAP sobre Postgres real** | Que `anon` vea sólo lo publicado; que no pueda leer comprobantes; que `editor` no borre gastos; que `auditor` sea sólo lectura; que cada `auth.*()` en una policy esté envuelto en subselect; que exista índice en cada columna de policy | Alta — es el nivel crítico |
| **Integración (aplicación)** | Vitest con repositorios en memoria | Casos de uso y capacidades del `AgentCapabilityService` | Media |
| **E2E** | Playwright (chromium + webkit + iPhone) | Los nueve flujos críticos del brief | 9 + accesibilidad |
| **Accesibilidad** | `@axe-core/playwright` | Cero violaciones WCAG 2.2 A/AA en todas las páginas públicas, desktop y mobile | Todas las páginas |
| **Performance** | Lighthouse CI | ≥ 95 en las cuatro categorías | Páginas principales |

Flujos E2E obligatorios (del brief, punto 18): abrir la home; entender la campaña; ver el
progreso; elegir método de aporte; copiar la cuenta; compartir; revisar transparencia; login de
admin; publicar una actualización.

Sobre TDD: se aplica RED → GREEN → REFACTOR en el dominio y en las policies RLS, donde el test
antes del código es genuinamente más rápido. No se aplica ceremonialmente a maquetación, donde el
loop de revisión visual es el mecanismo de verificación adecuado.

---

## 8. Estrategia SEO / AEO / WebMCP

### 8.1 SEO

Nada exótico: HTML semántico, contenido renderizado en el servidor, metadata por página,
`canonical`, `sitemap.xml`, `robots.txt`, imágenes optimizadas con `alt` descriptivo, y Core Web
Vitals tratados como requisito funcional.

JSON-LD, sólo lo que es honesto y está visible en la página:

| Tipo | Dónde | Nota |
|---|---|---|
| `Organization` + `WebSite` | Home | Sin `SearchAction`: la caja de búsqueda de sitelinks está discontinuada desde noviembre de 2024 |
| `Person` con `deathDate` | Página de Norma | Sólo si la familia publicó las fechas. **Si no, se omite; no se estima** |
| `Article` | Cada actualización | No `NewsArticle`: esto no es periodismo |
| `BreadcrumbList` | Páginas internas | |
| `DonateAction` como `potentialAction` | Cómo ayudar | Semánticamente honesto. **No** produce un botón en Google, pese a lo que se repite en blogs de SEO |
| `FAQPage` | Preguntas frecuentes | Opcional y de bajo valor: Google eliminó el rich result el 7/5/2026. Se incluye sólo porque las preguntas están visibles |

Prohibido: `Review` o `AggregateRating` sobre la campaña; `Offer`/`Product` para una donación;
un `DonateAction` completado en página pública (afirmaría que una donación ocurrió).

### 8.2 AEO / GEO

La evidencia de 2026 es clara y contraintuitiva: lo que consigue que un sitio sin fines de lucro
sea citado no son archivos especiales, son tres cosas.

1. **Datos originales con fecha visible.** Los montos conciliados de este sitio son datos que
   ningún modelo puede obtener de otra fuente. Es el activo de citabilidad más fuerte que hay, y
   es gratis: ya hay que publicarlos.
2. **Frescura.** Perplexity cita contenido actualizado en los últimos 30 días a una tasa del 82%
   contra 37% para contenido de más de un año. Y el 62% de sus citas viene de dominios `.org` y
   `.edu`, lo que estructuralmente favorece a este proyecto.
3. **Pregunta como encabezado, respuesta directa debajo.** Las nueve preguntas del brief se
   responden textualmente, en prosa, en las primeras dos o tres oraciones bajo cada `h2`.

`robots.txt`: **un solo bloque permisivo.** No se enumeran bots de IA para "permitirlos" — no
agrega ningún permiso que `User-agent: *` no otorgue ya, y crea deuda de mantenimiento. No se
bloquea a ningún crawler de entrenamiento: que el proyecto sea la respuesta memorizada a "quién
fue Norma" es valioso y no hay modelo de negocio que proteger.

`llms.txt`: **un archivo escrito a mano, media hora, y nada más.** La evidencia es contundente
(Ahrefs: 97% de los archivos nunca se leen; Google declara explícitamente que no lo usa). Se
incluye porque cuesta poco, Meta sí lo lee y Lighthouse lo audita. No se construye pipeline, no
se generan gemelos `.md` de cada página, no se publica `llms-full.txt` (que no existe en la
especificación).

### 8.3 WebMCP

Estado real: propuesta de un solo motor (Chromium), en Community Group Report, con WebKit
formalmente en contra y revisión del TAG incompleta. Origin trial en Chrome 149–156, envío
propuesto para 157, sin garantía. **Ningún agente de consumo masivo descubre hoy herramientas
WebMCP.**

Conclusión: se implementa porque el costo es bajo y prepara el terreno, con dos reglas duras.
Todo el código en **un** archivo detrás de feature detection, y **sólo herramientas de lectura**.

| Herramienta | Devuelve | Anotaciones |
|---|---|---|
| `get_campaign_status` | Objetivo, recaudado, porcentaje, moneda, última actualización | `readOnlyHint: true` |
| `get_donation_methods` | Métodos públicos de aporte, sin datos privados | `readOnlyHint: true` |
| `get_reconstruction_progress` | Hitos y porcentaje de avance | `readOnlyHint: true` |
| `get_norma_story` | Información pública de la historia | `readOnlyHint: true` |
| `get_transparency_summary` | Ingresos, gastos, saldo, última conciliación | `readOnlyHint: true` |

Ninguna herramienta inicia, confirma ni sugiere un pago. Ninguna devuelve datos personales.
Todas validan su entrada del lado servidor, aunque el esquema ya la valide, porque el esquema es
una pista para el modelo y no una frontera de seguridad. Se respetan los presupuestos de Chrome
(descripción ≤ 500 caracteres, nombre ≤ 30, salida ≤ 1,5K). Los errores se devuelven como prosa
que el modelo pueda accionar, no como excepciones opacas.

---

## 9. Modelo de datos propuesto

### 9.1 Principio: auditabilidad desde el diseño

Dos decisiones que hacen la diferencia entre "una tabla de gastos" y algo auditable:

1. **Montos en enteros (centavos) con moneda explícita.** Nunca `float`, nunca un monto sin
   moneda al lado.
2. **Nada se borra.** Los registros financieros se anulan con `voided_at` y motivo, no con
   `DELETE`. Un historial que puede desaparecer no es un historial.

### 9.2 Entidades del primer release

Sólo lo que se usa. Las demás quedan diseñadas, no creadas.

```
campaigns ────┬──── contributions      (aportes; registrados a mano tras conciliar)
              ├──── expenses ──── expense_receipts   (comprobantes → bucket privado)
              ├──── budget_items      (rubros con monto estimado: techo, instalación, etc.)
              ├──── milestones        (hitos con estado y fecha)
              ├──── updates ──── media (novedades publicables y compartibles)
              └──── payment_methods   (transferencias AR / CL / US; extensible)

people          (Norma y personas del proyecto; entidad pública editorial)
media           (fotos con alt obligatorio, crédito y orden)
app_users ──── user_roles   (owner / admin / editor / auditor)
audit_log       (quién cambió qué y cuándo; append-only)
```

Diferidas hasta que existan: `programs`, `courses`, `registrations` (Riacho Conecta),
`documents`, `donors`.

### 9.3 Reglas de visibilidad

| Tabla | `anon` puede leer | Notas |
|---|---|---|
| `campaigns`, `budget_items`, `milestones`, `payment_methods`, `people`, `media` | Sólo filas con `published_at` no nulo | |
| `updates` | Sólo publicadas | |
| `expenses` | Sí, las publicadas: concepto, categoría, monto, fecha | Es el corazón de la transparencia |
| `expense_receipts` | **No.** Sólo metadatos (que existe un comprobante) | El archivo vive en bucket privado; se sirve por URL firmada a `auditor`+ |
| `contributions` | **No individualmente.** Sólo el agregado | Un aporte individual puede identificar a una persona |
| `user_roles`, `audit_log` | **No** | |

### 9.4 Vista pública agregada

Los totales se calculan en la base, no en el cliente, y se exponen por una vista con
`security_invoker = true` (las vistas *bypassean* RLS por defecto, que es exactamente la trampa
que documenta la skill oficial de Supabase). El sitio lee esa vista; nunca suma filas privadas en
el navegador.

### 9.5 Degradación sin base de datos

El contenido editorial (historia, textos, preguntas) vive versionado en el repositorio y validado
con Zod. Los datos que cambian (montos, gastos, hitos) vienen de Supabase. **Si Supabase no está
configurado, el sitio renderiza el contenido editorial y omite las cifras** en lugar de fallar.
Esto hace que el proyecto sea levantable por cualquiera con `npm install && npm run dev`, sin
credenciales — requisito del README.

---

## 10. Roadmap de implementación

Secuencia por dependencias técnicas, no por calendario. Cada etapa termina con CI en verde.

| Etapa | Contenido | Sale con |
|---|---|---|
| **E0** Research | Este documento | Análisis aprobado |
| **E1** Gobernanza | Spec Kit inicializado, constitución v1.0.0, ADRs 001–010 | `.specify/memory/constitution.md` |
| **E2** Especificación | Spec de producto, spec UX, modelo de datos, threat model, estrategia de tests, plan, tasks | `specs/001-*/` completo |
| **E3** Fundaciones | Scaffold Next 16, TS estricto, ESLint, Prettier, Vitest, Playwright, design tokens, primitives, CI | `npm run verify` en verde |
| **E4** Dominio | `Money`, `Percentage`, entidades, puertos, casos de uso, contenido versionado con Zod | Tests unitarios |
| **E5** Datos | Migraciones, RLS, pgTAP, shim local, typegen, repositorios Supabase | `db:verify` en verde |
| **E6** Páginas públicas | Home, historia, qué ocurrió, reconstrucción, cómo ayudar, transparencia, legado, Riacho Conecta, legales | Revisión visual desktop + mobile |
| **E7** Descubribilidad | Metadata, sitemap, robots, OG, JSON-LD, llms.txt, WebMCP | Tests de herramientas |
| **E8** Backoffice | Auth, RBAC, CRUD de aportes, gastos, avances, fotos, cuentas | E2E de admin |
| **E9** Verificación | Typecheck, lint, unit, component, pgTAP, E2E, axe, Lighthouse, loop visual | Todo verde |
| **E10** Convergencia | `speckit.converge`, documentación al día, PR | PR listo para review |

---

## 11. Decisiones que bloquean la especificación

Estas preguntas **no bloquean el trabajo técnico** —cada una tiene un supuesto explícito
documentado y una implementación que las tolera— pero sí bloquean el **lanzamiento público**.
Están todas listadas campo por campo en `docs/content-guide.md`.

### Bloquean el lanzamiento (dato real necesario)

| # | Decisión | Supuesto mientras no haya respuesta |
|---|---|---|
| D1 | **Datos bancarios reales** de AR (CBU/alias/titular/CUIT), CL (RUT/banco/cuenta) y US (routing/account/beneficiario) | Los métodos existen en el modelo pero se marcan `no publicado` y **la sección no se muestra**. Es el único dato que, si sale mal, hace que alguien transfiera al vacío |
| D2 | **Presupuesto de la reconstrucción**: total y desglose por rubro, con moneda | Se muestran los rubros sin monto y se omite el porcentaje |
| D3 | **Monto ya recaudado** y fecha de la última conciliación | Se omite la barra de progreso |
| D4 | **Fechas de Norma** (nacimiento, fallecimiento) y cómo la familia quiere que se cuente el accidente | El texto se escribe sin fechas y se omite `deathDate` del JSON-LD |
| D5 | **Fotografías reales**, con crédito y autorización de la familia | Se reserva el espacio con proporción correcta; no se generan imágenes sintéticas ni se usan bancos de stock |
| D6 | **Dominio definitivo** | Se asume `lacasadenorma.org`, configurable con una variable de entorno |

### Bloquean features, no el lanzamiento

| # | Decisión | Supuesto |
|---|---|---|
| D7 | ¿Se muestran nombres de quienes aportan? | **No.** Sólo el agregado. Cambiar esto requiere consentimiento explícito y un cambio de spec |
| D8 | ¿Existe personería jurídica de Fundación Norma? | No todavía. Se evita `NGO` y `nonprofitStatus` en el JSON-LD hasta que exista: afirmarlo sin registro sería markup engañoso |
| D9 | ¿Quién concilia y con qué frecuencia? | Semanal, una persona con rol `owner`. Queda en el runbook |
| D10 | ¿Se publican los comprobantes completos o sólo su existencia? | Metadatos públicos, archivo bajo URL firmada para `auditor`+. Un comprobante puede tener datos de terceros |
| D11 | Idioma del sitio | Castellano rioplatense sin prefijo; inglés en `/en`. Decisión original: un solo idioma. Enmendada por ADR-023 cuando el corredor de EE.UU. lo justificó |

---

## Apéndice: investigación de respaldo

Los informes completos, con fuentes y fechas, están en `docs/research/`:

- `2026-09-spec-kit.md` — flujo real de Spec Kit 1.0.5
- `2026-09-toolchain.md` — versiones verificadas del stack JS/TS y trampas
- `2026-09-agent-web-standards.md` — WebMCP, MCP, llms.txt, AEO, Schema.org
- `2026-09-supabase.md` — Supabase sin Docker, RLS, CI/CD

Todo lo que se afirma en este documento sobre versiones y APIs se verificó ejecutándolo en este
entorno el 2026-09-09, no se tomó de conocimiento previo.
