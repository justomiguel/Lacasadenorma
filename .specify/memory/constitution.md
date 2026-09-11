<!--
Sync Impact Report
==================
Cambio de versión: (plantilla sin llenar) → 1.0.0
Tipo de cambio: MAJOR inicial — ratificación de la constitución del proyecto.

Principios añadidos (12):
  I.    Specification First
  II.   Test Driven Development
  III.  Simplicidad
  IV.   Separación de responsabilidades
  V.    Seguro por defecto
  VI.   Accesibilidad
  VII.  Performance
  VIII. Diseño humano
  IX.   Listo para agentes
  X.    Observabilidad
  XI.   Documentación como producto
  XII.  Ningún fallo silencioso

Secciones añadidas:
  - Restricciones técnicas (stack fijado, versiones verificadas, prohibiciones)
  - Flujo de trabajo y compuertas de calidad (DoD, quality gates, revisión visual)
  - Governance

Plantillas y artefactos que dependen de esta constitución:
  ✅ .specify/templates/plan-template.md — sección "Constitution Check" se evalúa contra este archivo
  ✅ docs/00-analisis-inicial.md — coherente con los principios
  ⚠️  specs/001-*/ — se crea a continuación; debe declarar cumplimiento explícito

TODOs pendientes: ninguno. Todas las fechas y valores están resueltos.
-->

# Constitución de La Casa de Norma

Este proyecto existe para ayudar a reconstruir la casa de una familia después de la muerte de
Norma, y para dejar sentada la base técnica de Fundación Norma. Las dos cosas dependen de lo
mismo: que quien llegue al sitio confíe en lo que lee. Esta constitución existe para que esa
confianza no dependa del criterio del día.

Es de cumplimiento obligatorio y prevalece sobre cualquier otra práctica, preferencia o
conveniencia. Donde dice MUST, no hay excepción sin enmienda escrita.

---

## Core Principles

### I. Specification First

Ninguna feature existe sin especificación previa. Si una decisión importante —de producto,
arquitectura, modelo de datos, seguridad o contenido— no aparece en una spec, un plan, un ADR o
una task **antes** de escribirse el código, el trabajo MUST detenerse y documentarse primero.

Las especificaciones son la fuente de verdad; el código es su consecuencia. Cuando el código y la
spec discrepan, se corrige el que esté equivocado, pero MUST quedar explícito cuál fue.

Prohibido improvisar arquitectura dentro del código. Prohibido "lo documentamos después".

### II. Test Driven Development

Para lógica de negocio y para policies de autorización, el ciclo MUST ser RED → GREEN → REFACTOR:
el test se escribe antes, falla por el motivo correcto, y sólo entonces se implementa.

Este ciclo es obligatorio en:

- el dominio (cálculos de dinero, porcentajes, saldos, formateo);
- las policies RLS (un test que verifique que `anon` **no** puede leer lo que no debe);
- las capacidades del `AgentCapabilityService`.

No es obligatorio en maquetación ni en estilos, donde el mecanismo de verificación adecuado es el
loop de revisión visual (ver más abajo). Escribir un test que sólo re-describe el JSX no aporta
nada y MUST evitarse.

Un test que nunca falló no demuestra nada. Cada test nuevo MUST haberse visto en rojo.

### III. Simplicidad

Se prefiere la solución simple, explícita y legible. Ante dos implementaciones equivalentes, gana
la que un desarrollador nuevo entiende sin preguntar.

- Un patrón de diseño MUST resolver un problema identificado y nombrado. Los patrones ceremoniales
  están prohibidos.
- Una abstracción se introduce en el segundo caso de uso real, no en el primero imaginado.
- Una dependencia nueva MUST justificarse contra la alternativa de escribir el código.
- YAGNI aplica al código. **No aplica al modelo de datos ni a las fronteras de seguridad**, donde
  el costo de cambiar después es desproporcionado.

### IV. Separación de responsabilidades

Cuatro capas, con dependencias en una sola dirección:

```
presentation → application → domain ← infrastructure → persistence
```

Reglas verificables:

- `domain/` MUST NOT importar React, Next, Supabase ni ninguna librería de I/O. Es TypeScript puro.
- `application/` MUST depender de puertos (interfaces), nunca de implementaciones concretas.
- `presentation/` MUST NOT hablar con la base de datos: llama casos de uso.
- La misma lógica de negocio MUST servir a la UI, a la API, a WebMCP y a un futuro servidor MCP.
  Si hay dos caminos de código para la misma operación, hay un bug de seguridad esperando.

### V. Seguro por defecto

- Ningún secreto en el cliente. Nunca. En Next, todo `NEXT_PUBLIC_*` viaja al navegador; la clave
  secreta de Supabase MUST NOT tener ese prefijo ni usarse en código de cliente.
- RLS habilitada en **toda** tabla de un esquema expuesto, con policies explícitas que reflejen el
  modelo de acceso real. `TO authenticated` sin predicado de propiedad es una vulnerabilidad
  (IDOR), no una policy.
- Privilegio mínimo: cada rol accede a lo estrictamente necesario.
- Validación server-side **siempre**, incluso cuando ya validó el cliente o el esquema. Un esquema
  de entrada es una pista para quien llama, no una frontera de seguridad.
- Ningún dato de autorización MUST leerse de `user_metadata`: es editable por el usuario.
- `proxy.ts` MUST NOT tratarse como frontera de seguridad. Cada mutación revalida identidad y
  permisos del lado servidor.
- Los registros financieros no se borran: se anulan con motivo y fecha.

### VI. Accesibilidad

WCAG 2.2 nivel AA es el mínimo, no el objetivo. Concretamente:

- Cero violaciones de axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) en las páginas
  públicas, verificado en CI, en desktop y en mobile.
- Toda funcionalidad operable sólo con teclado, con foco visible y contraste suficiente.
- Un solo `h1` por página y jerarquía de encabezados sin saltos.
- Toda imagen con `alt` que aporte información, o `alt=""` si es decorativa. `alt` MUST NOT ser
  el nombre del archivo.
- Objetivos táctiles de al menos 44×44 px.
- `prefers-reduced-motion` respetado.
- Los errores de formulario se anuncian a lectores de pantalla y se asocian al campo.

### VII. Performance

Los Core Web Vitals son requisito funcional, no optimización posterior. Objetivo en producción:
Performance, Accessibility, Best Practices y SEO **≥ 95** cada uno.

- Server Components por defecto. `"use client"` MUST justificarse por interactividad real.
- Toda imagen pasa por `next/image` con dimensiones explícitas para no generar CLS.
- El contenido crítico MUST llegar como HTML servido, no depender de JS de cliente.
- Las fuentes se cargan con `next/font` y se autoalojan.
- Presupuestos de performance definidos y verificados en CI.

### VIII. Diseño humano

La interfaz MUST sentirse diseñada por personas. El estándar es: podría haberla hecho un estudio
editorial serio.

Prohibido explícitamente, porque es la firma visual de una web generada por IA:

gradientes decorativos · glassmorphism · blobs · una card para cada cosa · bordes redondeados en
exceso · hero genérico de SaaS · ilustraciones artificiales · emojis como decoración · iconografía
por relleno · layouts repetidos · animaciones sin función · copy corporativo.

Obligatorio: la fotografía tiene protagonismo; hay espacio negativo generoso; la tipografía y la
jerarquía hacen el trabajo; los detalles son sutiles.

Sobre el copy: se escribe en castellano rioplatense, concreto, digno y cercano. MUST NOT usarse
lenguaje de campaña vacío ("juntos podemos", "transformando vidas", "construyendo un futuro
mejor"). No genera lástima: genera empatía, confianza y esperanza. Nunca melodramático.

**Regla de honestidad del contenido (no negociable):** el sitio MUST NOT mostrar datos
inventados. Ningún monto, fecha, CBU, nombre o cifra de ejemplo puede llegar a producción
disfrazado de dato real. Todo campo sin dato verificado se marca como pendiente y **la UI lo
omite en lugar de rellenarlo**. Es preferible una sección ausente a una cifra falsa.

### IX. Listo para agentes

El sitio MUST ser utilizable por personas, por buscadores y por agentes, en ese orden de
prioridad. Ninguna capacidad para agentes puede degradar la experiencia humana.

- Todo lo agentic es *progressive enhancement*: el sitio funciona perfectamente sin WebMCP.
- Las capacidades para agentes MUST vivir en la capa de aplicación, no acopladas al framework, de
  modo que la misma lógica sirva a UI, API, WebMCP y a un futuro servidor MCP.
- Las herramientas expuestas a agentes son **de sólo lectura**. Ninguna herramienta MUST iniciar,
  confirmar ni facilitar una operación financiera, mientras no exista una primitiva de
  confirmación humana en la especificación.
- Ninguna herramienta MUST devolver información privada ni datos personales.
- Los datos estructurados MUST describir sólo lo que está visible en la página. Structured data
  engañosa está prohibida.

### X. Observabilidad

Un error importante MUST poder diagnosticarse sin adivinar.

- Logging estructurado con contexto suficiente para reproducir, y **sin datos sensibles**: nunca
  tokens, claves, cookies, ni datos personales.
- Los errores de servidor se registran con su causa; el usuario ve un mensaje comprensible.
- Health endpoint mínimo para verificar que el despliegue está vivo.
- Complejidad de observabilidad proporcionada al tamaño del proyecto: no se instala una plataforma
  de telemetría para nueve páginas.

### XI. Documentación como producto

`README.md`, `/docs`, `/docs/adr` y `/specs` MUST estar al día en el mismo commit que el cambio
que los afecta. Documentación desactualizada es peor que ausente porque se le cree.

- El README MUST permitir que otra persona levante el proyecto desde cero, sin credenciales.
- Toda decisión arquitectónica relevante MUST tener un ADR con contexto, alternativas consideradas
  y consecuencias, incluidas las malas.
- Los runbooks describen las operaciones recurrentes (conciliar, publicar, desplegar, rollback)
  con el detalle suficiente para ejecutarlas bajo presión.

### XII. Ningún fallo silencioso

Un error MUST ser visible, manejado y testeado.

- Prohibido `catch {}` vacío. Todo catch registra, o transforma en un error de dominio, o
  documenta en un comentario por qué ignorarlo es correcto.
- Prohibido el fallback silencioso a datos vacíos: si algo falla, la UI dice que falló.
- El estado de carga, el estado vacío y el estado de error MUST estar diseñados. Un estado no
  diseñado es un bug pendiente.
- Ningún `console.log` en producción.

---

## Restricciones técnicas

**Stack fijado.** Next.js 16.3.4 (App Router) · React 19.3.0 · TypeScript 6.0.3 en modo estricto ·
Tailwind CSS 4.3 con configuración CSS-first · Supabase (PostgreSQL 16, Auth, Storage) · Zod 4 ·
Vitest 5 · Testing Library · Playwright 1.63 · ESLint 9.39.5 · Prettier 3.9 · Vercel · GitHub
Actions.

**Regla de versiones verificadas.** Una dependencia MUST fijarse verificando sus
`peerDependencies`, no su tag `latest`. Está comprobado en este proyecto que las versiones
`latest` de `typescript` (7.x) y `eslint` (10.x) rompen el ecosistema actual. Toda afirmación
sobre una API que pudo cambiar MUST verificarse contra documentación oficial o ejecutándola, no
contra memoria.

**TypeScript.** `strict: true` más `noUncheckedIndexedAccess`, `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`. `any` MUST NOT aparecer salvo con comentario que
explique por qué no hay alternativa. Sin `@ts-ignore`; si hace falta, es `@ts-expect-error` con
motivo.

**Base de datos.** Toda modificación de esquema MUST llegar por migración versionada en
`supabase/migrations/`. Prohibido modificar producción a mano. Migraciones destructivas requieren
revisión explícita y plan de rollback documentado. `supabase db advisors` MUST correr limpio.

**Dinero.** Todo monto se almacena como entero en la unidad mínima (centavos) con su moneda al
lado. `float` para dinero está prohibido. Sumar montos de monedas distintas MUST ser un error de
tipos, no un bug de runtime.

**Privacidad.** Se recolecta el mínimo posible. Sin trackers invasivos, sin cookies de terceros,
sin identificación personal en analytics. Lo que se recolecta, para qué y cuánto se conserva MUST
estar documentado y publicado.

**Prohibiciones de dependencias.** Sin librerías de componentes visuales (el sistema de diseño es
propio). Sin frameworks agregados "por moda". Sin dependencia que sólo ahorre diez líneas.

---

## Flujo de trabajo y compuertas de calidad

### Definition of Done

Una feature está terminada sólo si **todo** esto es verdad:

1. cumple su especificación;
2. tiene tests en el nivel adecuado, y se los vio fallar antes de pasar;
3. `typecheck` pasa;
4. `lint` pasa;
5. `build` pasa;
6. accesibilidad revisada (axe limpio en las páginas afectadas);
7. revisada en mobile, no sólo en desktop;
8. seguridad considerada de forma explícita;
9. SEO considerado de forma explícita;
10. documentación actualizada en el mismo commit;
11. CI en verde.

### Quality gates

El merge MUST bloquearse si: falla un test, falla el lint, falla el typecheck, falla el build, hay
una migración inválida, se detecta un secreto, o existe una vulnerabilidad crítica conocida.

### Loop de revisión visual

Después de implementar cada página importante: ejecutar la aplicación, inspeccionar en desktop,
inspeccionar en mobile, capturar screenshots, analizarlas, detectar problemas, corregir y volver a
inspeccionar. Se repite hasta que el resultado sea genuinamente bueno.

Una interfaz MUST NOT declararse terminada porque compila.

### Git

`main` protegida. El flujo es: rama de feature → pull request → CI → preview → review → merge →
producción. Commits con mensaje descriptivo, preferentemente convencionales. `.env` MUST NOT
commitearse nunca; `.env.example` MUST estar completo y al día.

### Orden de prioridad ante conflicto

Cuando dos implementaciones válidas compitan, se decide en este orden:

**1. confianza · 2. humanidad · 3. simplicidad · 4. accesibilidad · 5. velocidad ·
6. mantenibilidad · 7. seguridad · 8. descubribilidad · 9. preparación para agentes ·
10. sofisticación técnica**

Las primeras nueve MUST NOT sacrificarse para hacer algo técnicamente interesante.

---

## Governance

Esta constitución prevalece sobre cualquier otra práctica del proyecto. En caso de conflicto entre
la constitución y una spec, un plan, una task o el código, **la constitución gana** y el otro
artefacto se corrige. Un principio no se reinterpreta para que el código encaje.

**Enmiendas.** Requieren: (a) el cambio documentado en este archivo, (b) justificación escrita del
motivo, (c) actualización de las plantillas y artefactos afectados, y (d) incremento de versión
según semver:

- **MAJOR** — se elimina o redefine un principio de forma incompatible.
- **MINOR** — se agrega un principio o una sección, o se amplía materialmente una guía.
- **PATCH** — aclaraciones, redacción, correcciones sin cambio semántico.

**Cumplimiento.** Toda pull request MUST verificar cumplimiento. Una violación deliberada MUST
justificarse en la tabla `Complexity Tracking` del plan correspondiente, con la alternativa más
simple que se descartó y por qué. Una violación sin justificar bloquea el merge.

**Guía de desarrollo en runtime.** `AGENTS.md` en la raíz del repositorio traduce estos principios
a instrucciones operativas para agentes y personas que trabajen en el código. MUST mantenerse
coherente con este archivo.

**Version**: 1.0.0 | **Ratified**: 2026-09-09 | **Last Amended**: 2026-09-09
