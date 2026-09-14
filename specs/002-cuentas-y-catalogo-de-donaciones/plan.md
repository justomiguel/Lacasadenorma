# Implementation Plan: Cuentas del público, catálogo de donaciones y muro

**Branch**: `main` (sin rama de feature) | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-cuentas-y-catalogo-de-donaciones/spec.md`

---

## Summary

Tres cosas que parecen tres features y son una sola: para reservar un ítem del catálogo hace falta una
cuenta, y para que la reserva sirva de algo hace falta avisarle por correo a quien la hizo.

El orden de implementación lo fija la seguridad, no el producto. Abrir el registro público convierte
`authenticated` en "cualquiera con un correo" y eso reescribe la premisa sobre la que están escritas
todas las policies del proyecto ([ADR-027](../../docs/adr/027-identidad-publica.md)). Así que la
primera fase no entrega ninguna pantalla: entrega la frontera nueva, su compuerta automática
(`npm run check:rls`) y la persona `donante` agregada a la matriz de pgTAP. Recién después llega el
catálogo.

El resto del enfoque técnico en una línea cada uno:

- **Sobreventa**: imposible por `check` de tabla más `update` condicional dentro de
  `claim_donation_item()`. No se lee antes de escribir ([ADR-029](../../docs/adr/029-reserva-sin-sobreventa.md)).
- **Correo**: SMTP de Resend para lo que emite GoTrue, puerto `EmailSender` sobre `fetch` para lo del
  producto, fuera de la transacción y con degradación explícita ([ADR-028](../../docs/adr/028-correo-resend.md)).
- **Muro**: `grant select (cinco columnas) to anon` más policy de filas más vista con
  `security_invoker` ([ADR-030](../../docs/adr/030-muro-por-privilegio-de-columna.md)).
- **Plata**: las donaciones en especie no tocan `campaign_totals` ([ADR-031](../../docs/adr/031-donacion-en-especie-no-es-plata.md)).

---

## Technical Context

**Language/Version**: TypeScript 6.0.3 estricto (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`),
Node ≥ 22.

**Primary Dependencies**: las que ya están. Next 16.3.4, React 19.3.0, `@supabase/ssr` 0.12.7,
`@supabase/supabase-js` 2.116.0, Zod 4.6.0, Tailwind 4.3.3. **Cero dependencias nuevas**: el
adaptador de Resend es `fetch` (ADR-028) y el sistema de diseño ya tiene los primitivos de formulario
que el registro necesita.

**Storage**: PostgreSQL 17 vía Supabase. Cuatro tablas nuevas (`donor_profiles`, `donation_items`,
`donation_pledges`, `email_deliveries`), dos vistas, cinco funciones, un enum. Todo por migración
versionada en `supabase/migrations/`.

**Testing**: Vitest 5 (dominio y aplicación, umbrales de cobertura ya fijados: dominio 90–95%,
aplicación 75–85%), pgTAP (matriz de permisos, privilegios de columna, concurrencia), Playwright 1.63
en los dos modos (`sin-datos`, `con-datos`) con `@axe-core/playwright`.

**Target Platform**: web servida desde Vercel, primero teléfono (360 px), después escritorio
(1440 px).

**Project Type**: aplicación web con App Router, cuatro capas
(`components → application → domain ← infrastructure`).

**Performance Goals**: sin cambios respecto de los presupuestos de `lighthouserc.json` (ADR-018) para
las páginas existentes. El catálogo y el muro entran a los mismos presupuestos: ≥ 95 en las cuatro
categorías. El catálogo es un Server Component con ISR de cinco minutos (ADR-017); la reserva es una
Server Action, no una llamada de cliente.

**Constraints**: ningún archivo de código supera 300 líneas (`max-lines`); `"use client"` sólo donde
hay interactividad real, y lo más abajo posible en el árbol (los formularios de cuenta y el botón de
reservar, no las páginas); contenido público en los dos idiomas; sin valores arbitrarios de Tailwind.

**Scale/Scope**: decenas de ítems, cientos de cuentas, decenas de correos por semana. Tres páginas
públicas nuevas por idioma, cuatro pantallas de cuenta, dos del backoffice, una capacidad de agente.

---

## Constitution Check

*GATE: pasa antes de la fase 0 y se vuelve a evaluar después del diseño.*

| Principio | Cómo lo cumple esta feature | Estado |
|---|---|---|
| I · Specification First | Esta spec, este plan y cinco ADR se escriben **antes** de la primera línea de código. Las decisiones de producto sin resolver están nombradas como D1–D3, no supuestas en silencio | ✅ |
| II · TDD | Va en rojo primero, y acá es donde más importa: la matriz de permisos de la persona `donante`, la prueba de concurrencia de la reserva, los privilegios de columna de `anon`, la máquina de estados de la reserva y el cálculo de disponibilidad. Maquetación, por revisión visual | ✅ |
| III · Simplicidad | Cero dependencias nuevas. Sin cola de correo, sin captcha, sin motor de plantillas. OAuth usa el que Auth ya trae (ADR-038), no un SDK. El único patrón agregado es el puerto `EmailSender`, y existe porque hay dos implementaciones reales el primer día (Resend y la que registra y no manda) | ✅ |
| IV · Separación de responsabilidades | Disponibilidad y máquina de estados en `src/domain`, casos de uso en `src/application`, Supabase y Resend en `src/infrastructure`. La regla de ESLint que prohíbe a `components/**` importar Supabase ya está y aplica igual | ✅ |
| V · Seguro por defecto | Es el eje de la feature. RLS con predicado de propiedad o rol en toda policy nueva, privilegio de columna para el muro, escrituras por función `security definer`, validación con Zod del lado servidor, y **una compuerta que verifica todo eso en cada commit** | ✅ |
| VI · Accesibilidad | axe sobre las tres páginas nuevas en los dos viewports; errores de formulario asociados al campo y anunciados; objetivos de 44 px; el flujo completo con teclado es SC-207 | ✅ |
| VII · Performance | Server Components y Server Actions; el catálogo entra a los presupuestos existentes; las fotos de ítems por `next/image` con dimensiones reales | ✅ |
| VIII · Diseño humano | Se usan los primitivos que ya existen (`ChapterHeading`, `PreviewCard`, `Figure`, `Band`), no se inventa un lenguaje para el catálogo. Copy en rioplatense concreto. **Ningún dato inventado**: sin ítems de ejemplo, sin nombres de muestra en el muro, sin precios estimados publicados | ✅ |
| IX · Listo para agentes | El catálogo se expone como capacidad de **sólo lectura** y sin datos personales. Ninguna capacidad reserva nada: reservar es una operación con consecuencias sobre una persona real | ✅ |
| X · Observabilidad | `email_deliveries` hace visible cada intento de envío; los errores de reserva se registran con su causa y la persona ve un mensaje comprensible | ✅ |
| XI · Documentación como producto | `docs/privacy.md`, `/legales/privacidad` en los dos idiomas, `docs/security.md`, `docs/runbook.md` (verificar dominio, rotar la clave, habilitar `pg_cron`) y `docs/architecture.md` se actualizan **en el mismo commit** que el código que las afecta | ✅ |
| XII · Ningún fallo silencioso | El fallo de correo se registra y se dice en pantalla; el vencimiento no depende del cron; el conflicto de reserva es un estado **diseñado**, no un error genérico; estados vacío, de carga y de error de las tres pantallas nuevas, diseñados | ✅ |

**Restricciones técnicas.** Sin dependencias nuevas, así que `check:toolchain` no se toca. Todo monto
sigue siendo `bigint` + moneda (`Money`), y el valor estimado del ítem es nullable junto con su
moneda. Nada se borra: cancelar y vencer son estados. Ningún archivo supera 300 líneas, y el plan de
archivos de abajo está dividido con ese tope en la mano.

**Privacidad (restricción técnica, no principio).** Esta feature es la primera que guarda datos
personales del público, así que la constitución obliga a documentar y publicar qué se recolecta, para
qué y cuánto se conserva. FR-239 lo pone como condición del mismo despliegue, no como tarea
posterior: la política publicada hoy dice que el sitio no guarda datos personales, y el día que el
registro se habilite eso deja de ser cierto.

**Violaciones que requieren justificación**: ninguna. La tabla `Complexity Tracking` queda vacía a
propósito.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-cuentas-y-catalogo-de-donaciones/
├── spec.md                      # Qué y por qué, con D1–D3 pendientes
├── plan.md                      # Este archivo
├── research.md                  # Fase 0: lo verificado contra documentación oficial
├── data-model.md                # Fase 1: tablas, funciones, policies, privilegios
├── quickstart.md                # Fase 1: cómo levantarlo y verificarlo
├── contracts/
│   ├── cuentas.md               # Rutas, Server Actions y sesión del público
│   ├── catalogo.md              # Funciones RPC, vistas y capacidad de agente
│   └── correos.md               # Los seis correos: disparador, variables, idempotencia
├── checklists/requirements.md   # Calidad de la especificación
└── tasks.md                     # Fase 2
```

### Source Code (repository root)

Archivos nuevos y tocados, con su responsabilidad. La lista está partida para que ninguno se acerque
a las 300 líneas.

```text
supabase/
├── migrations/
│   ├── 2026…_public_accounts.sql        # donor_profiles, can_read_donors(), policies, is_staff
│   ├── 2026…_donation_catalog.sql       # donation_items, enum de unidad, vista donation_catalog
│   ├── 2026…_donation_pledges.sql       # pledges, CHECK de no-sobreventa, claim/cancel/fulfill/release
│   ├── 2026…_donation_wall.sql          # policy de anon, grant de columnas, vista donation_wall
│   └── 2026…_email_deliveries.sql       # email_deliveries + record_email_delivery()
└── tests/
    ├── 030-matriz-de-permisos.sql       # (tocado) se agrega la persona `donante`
    ├── 070-catalogo.sql                 # disponibilidad, no-sobreventa, concurrencia, vencimiento
    └── 080-donantes-y-muro.sql          # privilegios de columna, anonimato, borrado de cuenta

scripts/
└── check-rls.mjs                        # La compuerta de ADR-027

src/domain/
├── entities/donation-item.ts            # DonationItem, unidad, disponibilidad
├── entities/donation-pledge.ts          # DonationPledge, PledgeStatus
├── entities/donor.ts                    # DonorProfile, preferencia de anonimato e idioma
├── catalog.ts                           # remaining(), isCovered(), canClaim() — puro
├── pledge-status.ts                     # transiciones legales de la máquina de estados
├── permissions.ts                       # (tocado) catalogo.escribir, donaciones.leer/escribir
└── ports/
    ├── email.ts                         # EmailSender + EmailMessage + EmailKind
    ├── repositories.ts                  # (tocado) CatalogRepository, DonationWallRepository
    └── donations.ts                     # DonationPort (reservar, cancelar), AdminDonationPort

src/application/
├── use-cases/get-catalog.ts             # catálogo público con disponibilidad
├── use-cases/get-donation-wall.ts       # muro
├── use-cases/claim-item.ts              # reservar: valida, llama la RPC, dispara correo
├── use-cases/cancel-own-pledge.ts
├── use-cases/get-own-account.ts         # perfil + reservas propias
├── use-cases/update-own-profile.ts      # nombre público, anonimato, idioma, borrado
├── admin/catalog.ts                     # alta/edición/publicación de ítems
├── admin/donations.ts                   # confirmar llegada, cancelar con motivo
├── emails/                              # armado de cada correo desde content/, por tipo
└── agent-capabilities/capabilities.ts   # (tocado) capacidad `catalogo`

src/infrastructure/
├── email/resend-sender.ts               # POST a api.resend.com con Idempotency-Key
├── email/logging-sender.ts              # Sin credencial: registra y no manda
├── email/index.ts                       # getEmailSender()
├── supabase/catalog-repository.ts
├── supabase/donations-port.ts           # llama claim/cancel/fulfill
├── supabase/admin/catalog-port.ts
└── auth/viewer.ts                       # (tocado) distinguir audiencia pública de interna

app/(es)/
├── catalogo/page.tsx                    # y (en)/en/catalogo/
├── quienes-ayudaron/page.tsx            # y (en)/en/quienes-ayudaron/
├── cuenta/page.tsx                      # mis reservas
├── cuenta/ingresar/page.tsx
├── cuenta/crear/page.tsx
├── cuenta/recuperar/page.tsx
├── cuenta/clave/page.tsx                # fijar contraseña nueva
├── cuenta/confirmar/route.ts            # verifyOtp del enlace del correo
├── cuenta/actions.ts                    # Server Actions de identidad y perfil
├── admin/(panel)/catalogo/…             # alta, edición, publicación
└── admin/(panel)/donaciones/…           # confirmar llegada, cancelar

components/
├── screens/catalog-screen.tsx           # y sus partes en components/catalog/
├── screens/wall-screen.tsx
├── screens/account/…                    # formularios de cuenta
├── catalog/item-card.tsx, claim-form.tsx, availability.tsx, conflict-notice.tsx
└── design-system/field.tsx              # primitivo de campo de formulario, si no alcanza el actual

content/
├── es/catalogo.json, en/catalogo.json
├── es/cuenta.json, en/cuenta.json
├── es/emails.json, en/emails.json
├── es/legales.json, en/legales.json     # (tocado) qué se guarda y cómo se borra
└── schemas/                             # esquemas Zod de los tres nuevos

e2e/
├── con-datos/catalogo.spec.ts           # reservar, conflicto, anonimato, muro
├── con-datos/cuenta.spec.ts             # registro, confirmación, borrado
├── sin-datos/degradacion.spec.ts        # (tocado) catálogo omitido con aviso
├── comun/accesibilidad.spec.ts          # (tocado) las tres páginas nuevas
└── comun/revision-visual.spec.ts        # (tocado) espacios reservados del catálogo

proxy.ts                                 # (tocado) refrescar sesión también en /cuenta
```

**Structure Decision**: no se agrega ninguna capa ni directorio raíz nuevo. El catálogo entra en las
cuatro capas que ya existen y en el grupo de rutas por idioma que ya existe (ADR-023). Los dos
directorios nuevos son `src/application/emails/` —una función por tipo de correo, para que ninguna
crezca— y `components/catalog/`, en la misma línea que `components/campaign/`.

---

## Phase 0: Outline & Research

Salida: [research.md](./research.md). Lo que había que verificar y no recordar:

1. **API de Resend**: endpoint, autenticación, campos e idempotencia, contra la documentación oficial.
2. **SMTP de Resend**: host, puertos, usuario y qué significa cada puerto.
3. **Configuración de Auth de Supabase**: nombres exactos de las claves de `config.toml` para
   registro, confirmación obligatoria, SMTP y límites de tasa.
4. **Por qué no se confía en `email_verified` del token**, y qué se usa en su lugar.
5. **Concurrencia en Postgres**: por qué el `update` condicional alcanza y qué pasa con el lock.
6. **Privilegios de columna** y su interacción con RLS y con `security_invoker`.
7. **`pg_cron`**: qué se puede probar localmente y qué no (ADR-013).

## Phase 1: Design & Contracts

Salidas: [data-model.md](./data-model.md), [contracts/](./contracts/),
[quickstart.md](./quickstart.md).

`data-model.md` cierra las cuatro tablas con sus invariantes, las cinco funciones con su firma y su
comprobación de autorización en la primera línea, la matriz de visibilidad ampliada con la persona
`donante`, y los privilegios de columna del muro.

Los tres contratos describen las fronteras: qué rutas y Server Actions expone la identidad, qué
funciones y vistas expone el catálogo (y qué devuelve la capacidad de agente), y los seis correos con
su disparador, sus variables y su clave de idempotencia.

**Re-evaluación de la Constitution Check después del diseño**: sin violaciones nuevas. El diseño
agrega tres funciones `security definer` más de las que había, y las tres quedan cubiertas por la
regla 3 de `check-rls.mjs` (`set search_path = ''` obligatorio), que es la compuerta que ADR-004 dejó
anotada como el descuido que `db advisors` marca y la documentación oficial omite.

---

## Phase 2: Tasks

Salida: [tasks.md](./tasks.md). Seis fases, cada una commiteable y pusheable a `main` con
`npm run verify` en verde, y cada una útil por sí sola:

| Fase | Qué entrega | Se puede desplegar sin la siguiente |
|---|---|---|
| A | La frontera nueva: cuentas del público, `check:rls`, persona `donante` en la matriz | Sí: el sitio queda igual, mejor probado |
| B | Correo: puerto, adaptador, SMTP, plantillas, `email_deliveries` | Sí: el equipo recupera contraseñas desde el sitio |
| C | Catálogo público y su administración, sin reservas | Sí: el sitio ya dice qué falta |
| D | Reservas, `/cuenta`, correos de reserva y recordatorio | Sí: el catálogo ya asigna |
| E | Muro de quienes ayudaron | Sí |
| F | Capacidad de agente, SEO, privacidad publicada, runbook | Sí |

La fase A es bloqueante para todas. La única dependencia fuerte entre las demás: E necesita D, y D
usa B si está (y funciona sin B, por FR-233).

**Nota sobre FR-239**: la fase A abre el registro, así que la actualización de la política de
privacidad **no puede esperar a la fase F**. Se adelanta a la A y la fase F sólo la revisa. Está
anotado en `tasks.md` como dependencia explícita, porque es el tipo de cosa que se descubre tarde.

---

## Complexity Tracking

> Sin violaciones de la constitución que justificar. Tabla deliberadamente vacía.
