# AGENTS.md — cómo trabajar en este repositorio

Este archivo traduce `.specify/memory/constitution.md` a instrucciones operativas. Si algo acá
contradice la constitución, gana la constitución y este archivo se corrige.

**Antes que nada, leé `.cursor/rules/trabajo.mdc`.** Fija dos cosas que no se negocian y que le ganan
a cualquier Skill: **se trabaja sobre `main`, directo, sin ramas de feature ni pull requests**, y las
mayores de `typescript` y de `eslint` no se aceptan, se deciden. El orden de autoridad completo está
en la constitución, en "Governance · Orden de autoridad": constitución → `.cursor/rules/` → este
archivo y `specs/` → Skills.

Idioma: **el contenido público está en castellano rioplatense (sin prefijo) y en inglés (`/en`);
la documentación y los nombres de rutas siguen en castellano; el código, los identificadores, los
commits y los nombres de tablas están en inglés** (ADR-014, ADR-023). El backoffice no se
traduce. `content/index.ts` es `server-only`: un componente de cliente que lo importe rompe el
build, a propósito.

## Antes de escribir código

1. Buscá la decisión en `specs/001-sitio-publico-campana/` y en `docs/adr/`. Si no está, **paralo y
   documentalo primero**. No se improvisa arquitectura dentro del código (principio I).
2. Si la tarea toca dominio, policies RLS o capacidades de agentes: **el test va primero** y tiene
   que fallar por el motivo correcto antes de implementar (principio II).

## Reglas que rompen el build si las violás

- `src/domain/**` no importa React, Next, Supabase ni nada con I/O. Lo impone ESLint.
- `src/application/**` importa puertos de `src/domain/ports`, nunca `src/infrastructure`.
- `components/**` no importa `src/infrastructure/supabase/*`: llama casos de uso.
- Ningún `console.log`. `warn` y `error` están permitidos.
- Ningún `catch {}` vacío.
- Ningún `any` sin comentario que explique por qué no hay alternativa.
- Ningún archivo de código de más de 300 líneas (sin contar blancos ni comentarios). Lo
  impone ESLint `max-lines`. Si se acerca, se parte; no se sube el número.
- Una marca de terceros (PayPal, Mercado Pago, WhatsApp, etc.) que aparece como tab,
  botón o enlace lleva su logo al lado del nombre. Lo impone `npm run check:marcas`.
- Ninguna policy RLS que alcance a `authenticated` sin comprobar rol o propiedad, ninguna
  `for all`, ninguna función `security definer` sin `search_path` y ninguna vista sin
  `security_invoker`. Lo impone `npm run check:rls`, y el motivo está en
  [ADR-027](./docs/adr/027-identidad-publica.md): con el registro del público abierto,
  `authenticated` significa cualquiera con un correo. Una apertura deliberada se declara con
  su motivo en `scripts/check-rls.mjs`.

## Reglas que no rompen el build y son igual de obligatorias

- **Ningún dato inventado llega a la interfaz.** Sin CBU de ejemplo, sin montos de muestra, sin
  fechas estimadas. Si el dato no está verificado, la sección se omite. `npm run check:placeholders`
  verifica lo que puede; el resto es criterio.
- Todo monto es un entero en unidad mínima más su moneda: `bigint` en la base, `Money` en
  TypeScript. Nunca `float`, nunca decimales, nunca sumar monedas distintas.
- Nada financiero se borra: se anula con `voided_at` y `void_reason`.
- Server Components por defecto. `"use client"` sólo con interactividad real, y lo más abajo posible
  en el árbol.
- Toda imagen por `next/image` con `width`/`height` reales y `alt` que aporte información.
- Los estados vacío, de carga y de error se diseñan. Un estado sin diseñar es un bug abierto.

## Diseño

Leé `docs/adr/032-relato-mobile-editorial.md` y `specs/001-sitio-publico-campana/ux.md` antes de
tocar una pantalla. La regla `.cursor/rules/diseno.mdc` resume las dos y se adjunta sola al editar
`app/`, `components/` o `content/`. **Se diseña a 390 px primero** y después se adapta a escritorio,
nunca al revés. Los tokens viven en `app/globals.css` dentro de `@theme`; **no** se
usan valores por defecto de Tailwind ni valores arbitrarios (`text-[13px]`) en producción.

Prohibido: gradientes decorativos, glassmorphism, blobs, cards para todo, radios grandes, sombras
difusas, emojis decorativos, iconos de relleno (los logos de marcas de terceros no son eso: van
siempre al lado del nombre), animaciones sin función, copy de folleto, píldoras fuera de lo que es
redondo por significado. Y los tres delatores que este sitio ya tuvo: la sobrelínea en VERSALES
arriba de cada título (hoy existe **sólo** como etiqueta de los cinco momentos de la home, con
`data-kicker`), un solo plano sin sangrado ni bandas, y un solo tamaño de texto haciendo de
jerarquía. Tres familias de acción y ninguna más: primaria rectangular, secundaria texto + flecha,
utilitaria icónica (`components/design-system/actions.tsx`, `icons.tsx`).

La fotografía estructura la página. Las editoriales viven en `public/fotos/` declaradas en
`content/*.json`; las del avance vienen de la base con cada novedad. Sin foto real no se pone stock ni
ilustración: se reserva el espacio y se dice qué va ahí, y el hueco se cuenta: `revision-visual.spec.ts`
exige el número **exacto** de espacios reservados por página, así que si el material llegó y nadie lo
ubicó, falla. `npm run check:fotos` comprueba que cada foto declarada exista y mida lo que dice. Al
compartir, la previa social es el símbolo 01 ORIGINAL y el texto de esa página, no una foto
(ADR-036).

## Comandos

```bash
npm run dev              # servidor de desarrollo
npm run verify           # herramientas + typecheck + lint + formato + tests + chequeos + build
npm run test             # unitarios y de componente
npm run test:e2e         # Playwright
npm run db:verify        # Postgres local: reset + migraciones + advisors + pgTAP
npm run check:toolchain  # las versiones de las herramientas son las decididas
npm run check:marcas     # cada marca de terceros tiene logo y se usa al lado del nombre
npm run check:marca      # cada variante propia tiene archivo y las medidas del catálogo
npm run check:rls        # ninguna policy le abre el acceso a cualquiera que se registre
```

`npm run verify` en verde es la condición para pushear, porque se pushea a `main` y no hay pull
request que frene nada después. `check:toolchain` va primero a propósito: cuando una dependencia se
movió de más, `typecheck` y `lint` fallan las dos disfrazadas de otra cosa.

`next typegen` corre antes de `typecheck` y de `lint`: `PageProps` y `LayoutProps` son tipos
globales generados, y sin generarlos el typecheck falla en las páginas.

## Definition of Done

Especificación cumplida · tests en el nivel adecuado, vistos en rojo antes · typecheck · lint ·
build · axe limpio · revisado en 360 px y en 1440 px · seguridad considerada · SEO considerado ·
documentación actualizada en el mismo commit · `npm run verify` en verde antes de pushear a `main` ·
CI en verde después.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
