# Fase 1 — Estrategia de testing

Principio rector: **se testea lo que puede lastimar a alguien.** En este proyecto eso son las
policies de autorización y las cifras de transparencia, no la maquetación. Por eso la pirámide está
deliberadamente engrosada en el nivel de integración de datos.

---

## 1. Niveles

| Nivel | Herramienta | Qué cubre | Qué **no** cubre |
|---|---|---|---|
| **Unitario** | Vitest | Dominio puro: `Money`, `Percentage`, cálculo de saldo y de porcentaje ejecutado, agregación por moneda, formateo `es-AR`, parseo del contenido con Zod, redacción del logger, renderizado seguro de Markdown | Nada que toque red o base de datos |
| **Componentes** | Vitest + Testing Library | Primitivas del sistema de diseño: `CopyField`, `ProgressBar`, `CountryTabs`, `Ledger`, `Figure`, `Callout`, y los estados vacío/error | Estilos, píxeles, capturas |
| **Integración de datos** | **pgTAP sobre PostgreSQL 17 real** ([ADR-013](../../docs/adr/013-base-datos-local.md)) | Cada combinación rol × tabla × operación; existencia de índices en columnas de policy; que toda vista tenga `security_invoker`; que toda llamada `auth.*()` esté envuelta en subselect; que `audit_log` no acepte `delete`; que el hook del token corra como `supabase_auth_admin` | El comportamiento de GoTrue. PostgREST sí se ejerce, pero en el nivel E2E |
| **Integración de aplicación** | Vitest con repositorios en memoria | Casos de uso, las cinco capacidades de agentes, la equivalencia entre el adaptador REST y el caso de uso | Persistencia real |
| **E2E** | Playwright (chromium, webkit, iPhone 15) | Los nueve flujos críticos | Rendimiento medido |
| **Accesibilidad** | `@axe-core/playwright` | Cero violaciones `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` en todas las páginas públicas, en dos viewports | Lo que axe no detecta: orden lógico, calidad del `alt`, sentido del texto. Eso se revisa a mano |
| **Performance** | Lighthouse CI | Presupuestos y las cuatro categorías ≥ 95 | |
| **Visual** | Capturas en desktop y mobile, revisadas | Los criterios de aceptación visual de `ux.md` | |

---

## 2. Dónde se aplica TDD estricto

RED → GREEN → REFACTOR es **obligatorio** en:

1. **Dominio.** `Money.add` con monedas distintas tiene que fallar antes de existir la
   implementación.
2. **Policies RLS.** El test que dice "`anon` no puede leer `expense_receipts`" se escribe antes de
   la policy, y tiene que fallar cuando la tabla todavía no tiene RLS.
3. **Capacidades de agentes.** El contrato de salida se fija antes de la implementación.

No se aplica en maquetación ni estilos: ahí el mecanismo de verificación es el loop de revisión
visual, y un test que sólo re-describe el JSX no aporta nada (principio II).

---

## 3. Los nueve flujos críticos (E2E)

| # | Flujo | Aserción central |
|---|---|---|
| 1 | Abrir la home | Nombre, propuesta y acción principal visibles sin desplazarse en 360 px |
| 2 | Entender la campaña | Las nueve preguntas están respondidas en el HTML servido |
| 3 | Ver el progreso | Recaudado, objetivo y fecha de conciliación presentes y coherentes |
| 4 | Elegir método de aporte | Cambiar de país muestra los datos correctos, también sin JavaScript |
| 5 | Copiar la cuenta | El portapapeles contiene el valor exacto y hay confirmación anunciada |
| 6 | Compartir la campaña | Las metaetiquetas de OpenGraph son correctas y la imagen resuelve |
| 7 | Revisar transparencia | La suma del detalle coincide con los totales; no hay acceso a comprobantes |
| 8 | Login de admin | Sin sesión redirige; con sesión entra; un rol insuficiente no ve lo que no le toca |
| 9 | Publicar una actualización | Se publica y aparece en la página pública |

Cada flujo corre en los tres proyectos de navegador. El 5 se ejecuta además sólo con teclado.

---

## 4. Casos de negación (los más importantes)

Un test que verifica que algo funciona vale menos que uno que verifica que algo **no** se puede
hacer. Los obligatorios:

- `anon` no obtiene ninguna fila de `contributions`.
- `anon` no obtiene ninguna fila de `expense_receipts`.
- `anon` no ve nada con `published_at` nulo.
- `editor` no lee `expenses` ni `contributions`.
- `editor` no escribe en `payment_methods`.
- `admin` no escribe en `payment_methods` (sólo `owner`).
- `auditor` no escribe en ninguna tabla.
- Nadie, incluido `owner`, borra de `audit_log`.
- `anon` no ejecuta `private.has_min_role`.
- Un rol declarado en `user_metadata` no otorga permisos.
- Ninguna capacidad de agente declara mutación.
- Un SVG renombrado a `.png` es rechazado.
- Una petición sin sesión a una acción del backoffice es rechazada del lado servidor.

---

## 5. Ejecución

```bash
npm run typecheck     # next typegen + tsc --noEmit
npm run lint          # eslint (incluye la regla de dependencias entre capas)
npm run test          # unitarios + componentes
npm run db:verify     # shim + migraciones + db lint + db advisors + pgTAP + typegen
npm run build
npm run test:e2e      # Playwright + axe
npm run verify        # todo lo anterior, en orden
```

`next typegen` **antes** de `typecheck` y de `lint` no es opcional: `PageProps` y `LayoutProps` son
globales generados que viven en `.next/types`, que está gitignorado. Sin eso, CI falla con
`TS2304: Cannot find name 'LayoutProps'`.

pgTAP reporta las fallas en su salida, no en el exit code: el runner parsea `not ok` y sale 1. Se
verifica introduciendo a propósito una aserción que falla y comprobando que el runner sale 1.

---

## 6. CI

| Workflow | Corre | Cuándo |
|---|---|---|
| `ci.yml` | install, typegen, typecheck, lint, format, unitarios con cobertura, build, auditoría de dependencias | Cada PR y push a `main` |
| `db.yml` | Postgres de apt + shim + migraciones + `db lint` + `db advisors` + pgTAP + verificación de que los tipos generados están commiteados | Cada PR que toca `supabase/` |
| `e2e.yml` | build + Playwright en tres proyectos + axe | Cada PR |
| `quality.yml` | Lighthouse CI y presupuestos | PR y `main` |

Ninguno requiere credenciales de Supabase: todo corre contra el Postgres local con el shim.

---

## 7. Cobertura

Se mide, no se persigue como número. Umbrales que sí se exigen porque son donde vive el riesgo:

| Área | Mínimo |
|---|---|
| `src/domain/` | 100% de ramas |
| `src/application/` | 90% |
| Policies RLS | Toda combinación rol × tabla × operación de la matriz, sin excepción |

Un porcentaje global alto con `src/domain` al 60% sería una mentira estadística, así que el umbral
es por área.

---

## 8. Lo que no se puede verificar sin credenciales

Se declara para que nadie lo confunda con cobertura real:

- Emisión y verificación de un JWT **asimétrico** contra el JWKS del proyecto. La suite E2E emite y
  verifica tokens HS256 firmados con el secreto que valida PostgREST, así que las policies RLS deciden
  de verdad; lo que no se ejerce es la rotación de claves ni el camino del JWKS.
- El resto del comportamiento de GoTrue: recuperación de contraseña, políticas de contraseña, límites de
  tasa, y que el hook esté **habilitado** en el panel. Que el hook *funcione* sí se verifica, invocándolo
  con el rol que lo invoca de verdad.
- Uploads reales a Storage y el comportamiento del CDN del bucket público.
- URLs firmadas reales de comprobantes.
- `supabase db push` contra un proyecto real y `db advisors --linked`.

La primera corrida contra el proyecto real es parte del runbook de despliegue, con
`db push --dry-run` como paso previo obligatorio.
