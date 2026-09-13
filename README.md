# La Casa de Norma

Reconstruimos una casa. Construimos un legado.

Norma fue una de las primeras comunicadoras sociales de Riacho He Hé, en Formosa. Pasó gran parte de
su vida ayudando a que las historias de su pueblo pudieran ser escuchadas. El 7 de septiembre un
incendio destruyó la casa de la familia y Norma murió esa madrugada.

Este repositorio es el sitio de la campaña para reconstruirla: explica quién fue Norma, qué pasó, qué
hay que reconstruir, cómo colaborar, y publica en qué se gastó cada peso que entró. La intención es
que cuando la casa esté terminada el proyecto siga, con el nombre de **Fundación Norma** y formación
gratuita en herramientas digitales. No existe todavía como organización, y el sitio lo dice así
(ADR-024).

El sitio no cobra. Los aportes van por transferencia bancaria y se registran a mano en un backoffice.
Eso no es una limitación técnica pendiente de resolver: es una decisión, y está explicada en
[ADR-006](./docs/adr/006-aportes.md).

---

## Levantarlo, desde cero

```bash
npm install
npm run dev          # http://localhost:3000
```

Eso es todo. **No hace falta ninguna credencial**, ningún archivo `.env`, ninguna base de datos y
ningún Docker.

Sin Supabase configurado el sitio muestra todo el contenido editorial —la historia, qué pasó, el
alcance de la obra, las preguntas frecuentes, las páginas legales— y en el lugar de cada cifra
muestra una explicación de por qué todavía no está, nunca un cero ni un dato de ejemplo. Es un
requisito del producto (FR-034), no una degradación tolerada: la mitad de la suite de pruebas de
punta a punta existe para verificar que ese modo funcione.

Requisitos: **Node.js ≥ 22** y npm ≥ 10. PostgreSQL sólo si vas a trabajar sobre el esquema, y en ese
caso está todo en [`docs/runbook.md`](./docs/runbook.md#2-la-base-de-datos-local-sin-docker).

### Verificar que está sano

```bash
npm run verify       # tipos, reglas de capas, formato, tests con cobertura, chequeos y build
npm run test:e2e     # los nueve flujos críticos y axe, en tres navegadores
```

`npm run verify` es la misma compuerta que corre en cada pull request. Si pasa localmente, pasa en
CI, salvo por las dependencias del sistema.

### Con datos de verdad

Para ver el sitio con cifras hay dos caminos, y ninguno necesita Docker:

| Camino | Cuándo conviene | Cómo |
| --- | --- | --- |
| PostgreSQL local con un fixture explícito | Trabajar en pantallas que muestran cifras, o en el esquema | [`docs/runbook.md`](./docs/runbook.md#2-la-base-de-datos-local-sin-docker) |
| Un proyecto de Supabase real | Probar el backoffice, la sesión y los comprobantes | [`docs/runbook.md`](./docs/runbook.md#3-un-proyecto-de-supabase-real) |

El fixture de desarrollo se carga **sólo** cuando se lo pide explícitamente
(`npm run db:fixture`) y sus datos son inventados a propósito, con nombres que se reconocen como
falsos de un vistazo. Nunca se aplica solo: [ADR-015](./docs/adr/015-fixture-de-desarrollo.md)
explica por qué eso importa en un sitio donde publicar un CBU equivocado tiene consecuencias reales.

---

## Cómo está armado

Next.js 16 con App Router y Server Components por defecto, React 19, TypeScript en modo estricto,
Supabase (PostgreSQL, Auth y Storage) y Vercel. Las versiones están fijadas, no en rango:
[ADR-001](./docs/adr/001-framework.md) explica por qué.

Cuatro capas con dependencias en una sola dirección, y ESLint rompe el build si alguna se cruza:

```
app/ + components/   presentación   ── llaman casos de uso, nunca a la base
src/application/     aplicación     ── casos de uso y capacidades para agentes
src/domain/          dominio        ── TypeScript puro: dinero, porcentajes, permisos, puertos
src/infrastructure/  infraestructura ── Supabase, logging, SEO, archivos, límite de tasa
content/ + supabase/ persistencia   ── JSON versionado y migraciones SQL
```

El detalle, con el recorrido completo de un pedido y de una mutación, está en
[`docs/architecture.md`](./docs/architecture.md).

### El mapa del repositorio

| Carpeta | Qué hay |
| --- | --- |
| `app/` | Rutas. Nueve páginas públicas, el backoffice en `/admin`, la API pública y los archivos de metadata |
| `components/` | `design-system/` son las primitivas propias; `campaign/` y `site/` las componen |
| `content/` | El contenido editorial en JSON, validado con Zod al importar |
| `src/` | Dominio, aplicación e infraestructura |
| `supabase/` | Migraciones versionadas, policies RLS, pruebas pgTAP y el shim local |
| `e2e/` | Playwright: los nueve flujos críticos y axe |
| `specs/` | La especificación del producto. Es la fuente de verdad, no el código |
| `docs/` | Arquitectura, despliegue, seguridad, privacidad, testing, SEO, agentes, contenido y runbook |
| `docs/adr/` | Las decisiones que serían caras de revertir, con las alternativas descartadas |
| `scripts/` | Base de datos local, API local, E2E, capturas y los chequeos de CI |

### Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run verify` | Tipos, lint, formato, tests con cobertura, chequeos y build. La compuerta completa |
| `npm test` | Unitarios y de componente (Vitest) |
| `npm run test:e2e` | Los dos modos de Playwright, uno después del otro |
| `npm run test:e2e:sin-datos` | Sólo el sitio sin base de datos |
| `npm run test:e2e:con-datos` | Sólo el sitio con la base local y el fixture |
| `npm run db:verify` | Recrea la base local, aplica migraciones, lint, advisors, pgTAP y tipos |
| `npm run db:fixture` | Carga el fixture de desarrollo |
| `npm run api:local` | API local compatible con Supabase, sin Docker |
| `npm run check:placeholders` | Que no haya datos de relleno en el contenido ni en la interfaz |
| `npm run check:secrets` | Que ninguna clave secreta esté en el JavaScript del navegador |
| `npm run check:fotos` | Que cada foto declarada exista y mida lo que dice, así el espacio reservado es el correcto |
| `node scripts/screenshots.mjs` | Las once páginas en 360 px y 1440 px, para el loop de revisión visual. Los criterios medibles de ese loop los verifica `test:e2e`; esto es para los cuatro que hay que mirar ([`docs/testing.md`](./docs/testing.md)) |

La lista completa está en `package.json`; los comandos de base de datos, uno por uno, en
[`docs/runbook.md`](./docs/runbook.md).

---

## Antes de escribir código

Este repositorio se desarrolla con especificación primero. La regla operativa, que vale también para
quien pase por acá una sola vez:

> Si una decisión importante no está en una spec, un plan, un ADR o una task **antes** de
> implementarse, el trabajo se detiene y se documenta primero.

En orden de lectura: [`.specify/memory/constitution.md`](./.specify/memory/constitution.md) fija los
principios; [`AGENTS.md`](./AGENTS.md) los traduce a reglas de trabajo, incluidas las que rompen el
build; [`specs/001-sitio-publico-campana/`](./specs/001-sitio-publico-campana/) tiene la
especificación, el modelo de datos, el modelo de amenazas, la estrategia de testing y la
especificación de UX.

Dos reglas que se olvidan y son las que más importan acá:

- **Ningún dato inventado llega a la interfaz.** Ni un CBU de ejemplo, ni un monto de muestra, ni una
  fecha estimada. Si el dato no está verificado, la sección se omite y se explica.
- **Los estados vacío, de carga y de error se diseñan.** Un estado sin diseñar es un bug abierto.

## La documentación

| Documento | Para qué |
| --- | --- |
| [`docs/architecture.md`](./docs/architecture.md) | Las capas, los patrones y el recorrido de un pedido |
| [`docs/deployment.md`](./docs/deployment.md) | Cómo llega un cambio a producción y cómo se vuelve atrás |
| [`docs/security.md`](./docs/security.md) | Fronteras, RLS, cabeceras, validación y secretos |
| [`docs/privacy.md`](./docs/privacy.md) | Qué se mide, qué no, y dónde está cada dato personal |
| [`docs/testing.md`](./docs/testing.md) | Los niveles de prueba, los nueve flujos y qué no se testea |
| [`docs/seo.md`](./docs/seo.md) | Metadata, datos estructurados, compartir y motores de respuesta |
| [`docs/webmcp.md`](./docs/webmcp.md) | Las capacidades para agentes y por qué son de sólo lectura |
| [`docs/content-guide.md`](./docs/content-guide.md) | Cómo se edita el contenido y cómo se escribe acá |
| [`docs/runbook.md`](./docs/runbook.md) | Operación: entornos, diagnóstico y qué hacer cuando algo falla |

## Sobre el contenido

El código de este repositorio es el andamio. El contenido —la historia de Norma, las fotografías, los
textos— es de su familia, y no está disponible para reutilizarse en otros proyectos. Lo que dice el
sitio al respecto está en [`/legales/terminos`](./content/legales.json).

Si encontrás un error en una cifra, en un dato bancario o en un nombre, es lo más urgente que puede
tener este repositorio: abrí un issue con la plantilla de contenido.
