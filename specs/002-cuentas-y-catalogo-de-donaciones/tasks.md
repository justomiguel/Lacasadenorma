---
description: "Tareas de la feature 002, por fases entregables"
---

# Tasks: Cuentas del público, catálogo de donaciones y muro

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md),
[contracts/](./contracts/)

**Tests**: obligatorios, y **vistos en rojo antes** donde la constitución lo exige (principio II):
dominio, policies RLS y capacidades de agentes. Maquetación, por revisión visual.

**Organización**: seis fases. Cada una se commitea y se pushea a `main` con `npm run verify` en verde
(no hay pull request que frene nada después), y cada una **deja el sitio en un estado publicable**.

## Formato: `[ID] [P?] [Fase] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias)
- Cada tarea nombra su archivo

---

## Fase A — La frontera nueva (bloqueante para todo lo demás)

**Objetivo**: que `authenticated` deje de significar "de confianza" **sin que se rompa nada**, y que
eso quede verificado por una compuerta y no por una lectura atenta.

**Prueba independiente**: `npm run check:rls` y `npm run db:verify` en verde, con la persona
`donante` cubierta en toda la matriz. El sitio se ve exactamente igual que antes.

### Compuerta primero

- [x] **T001** `scripts/check-rls.mjs`: las cuatro reglas de ADR-027, con la lista de aperturas
      declaradas y su motivo. **Visto en rojo** contra una migración de prueba con las cinco
      violaciones, y en verde contra las doce migraciones actuales.
- [x] **T002** Cablearlo: `check:rls` en `package.json` dentro de `verify`, en `ci.yml` y primero en
      `db.yml` (antes de instalar PostgreSQL, que tarda minutos).
- [x] **T003** [P] Documentarlo donde se busca: `AGENTS.md` (reglas que rompen el build),
      `README.md` (tabla de comandos), `docs/adr/README.md` (índice).

### Tests en rojo

- [x] **T004** [P] `supabase/tests/030-matriz-de-permisos.sql`: agregar la persona **`donante`**
      —autenticada, sin fila en `user_roles`— y probarla contra toda tabla y toda operación de la
      feature 001. Tiene que ver **nada** y escribir **nada** (FR-203, FR-204, SC-203).
- [x] **T005** [P] `supabase/tests/080-donantes-y-muro.sql`: `donor_profiles` sólo propio; que una
      cuenta no pueda leer ni editar el perfil de otra.
- [x] **T006** [P] `src/domain/permissions.test.ts`: los tres permisos nuevos y que `editor` **no**
      tenga `donaciones.leer`. Es la lección de `can_read_ledger()` aplicada a datos personales.

### Implementación

- [x] **T007** Migración `…_public_accounts.sql`: `donor_profiles` con RLS y policies de propiedad,
      `private.can_read_donors()` con `revoke`/`grant` como sus hermanas, índices.
- [x] **T008** `supabase/config.toml`: `enable_signup = true`, `enable_confirmations = true`,
      límites de tasa y bloque SMTP (contrato de cuentas). **`enable_confirmations` no es
      cosmético**: es lo que hace que tener sesión implique correo confirmado.
- [x] **T009** [P] `src/domain/permissions.ts`: `catalogo.escribir` (editor+), `donaciones.leer`
      (auditor/admin/owner), `donaciones.escribir` (admin+).
- [x] **T010** [P] `src/domain/entities/donor.ts`: `DonorProfile`, preferencia de anonimato e idioma.
- [x] **T011** `src/infrastructure/auth/viewer.ts`: distinguir audiencia pública de interna sin
      inventar una bandera — la ausencia de rol **es** la distinción.
- [x] **T012** `proxy.ts`: agregar `/cuenta` al matcher. Sigue sin ser frontera, y el comentario
      sobre copiar los headers de `setAll` sigue siendo obligatorio.
- [x] **T013** Pantallas de identidad: `/cuenta/crear`, `/cuenta/ingresar`, `/cuenta/recuperar`,
      `/cuenta/clave`, el route handler `/cuenta/confirmar` y `cuenta/actions.ts`, en los dos
      idiomas. Respuesta indistinguible en recuperación y en inicio de sesión (contrato de cuentas).
- [x] **T014** [P] `content/es/cuenta.json` y `content/en/cuenta.json` con su esquema Zod.
- [x] **T015** [P] `e2e/con-datos/cuenta.spec.ts`: registro, confirmación, y que una cuenta del
      público en `/admin` termine en `/admin/sin-permiso` (FR-206).
- [x] **T016** [P] `e2e/comun/accesibilidad.spec.ts`: las cuatro pantallas de cuenta, dos viewports.

### Privacidad: no puede esperar a la fase F

- [x] **T017** `content/es/legales.json` y `content/en/legales.json`, `docs/privacy.md`: qué se
      guarda, para qué, cuánto se conserva y cómo se borra. **En el mismo commit que T008**, porque
      la política publicada hoy dice que el sitio no guarda datos personales y desde T008 eso es
      falso (FR-239).
- [x] **T018** [P] `docs/security.md`: la amenaza nueva —`authenticated` es el público— con su
      mitigación, su compuerta y su disparador de revisión. Y el captcha como riesgo aceptado.
- [x] **T019** [P] `.env.example`: `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_STAFF_ADDRESS`.

**Punto de control**: el sitio anda igual, se pueden crear cuentas que no pueden hacer nada, y la
compuerta impide que eso cambie por descuido.

---

## Fase B — Correo

**Objetivo**: que el proyecto pueda mandar correo, y que **no dependa** de que pueda.

**Prueba independiente**: con clave, llega; sin clave, la operación se completa, queda `skipped` y la
pantalla lo dice.

- [x] **T020** [P] `src/domain/ports/email.ts`: `EmailSender`, `EmailMessage`, `EmailKind`,
      `EmailResult` como unión discriminada de `sent | failed | skipped`. TypeScript puro.
- [x] **T021** [P] `src/application/emails/*.test.ts` **en rojo**: armado de cada correo, en los dos
      idiomas, con la clave de idempotencia `<kind>/<subject_id>`, y que ningún cuerpo contenga datos
      de terceros.
- [x] **T022** `src/infrastructure/email/resend-sender.ts`: `POST https://api.resend.com/emails`,
      `Bearer`, `Idempotency-Key`, `text` **y** `html`. Sin dependencias nuevas.
- [x] **T023** [P] `src/infrastructure/email/logging-sender.ts` y `index.ts` con `getEmailSender()`.
- [x] **T024** Migración `…_email_deliveries.sql`: la tabla sin `update` ni `delete`, y
      `record_email_delivery()` **resolviendo el destinatario por dentro** (ADR-028).
- [x] **T025** [P] `content/es/emails.json` y `content/en/emails.json` con su esquema.
- [x] **T026** [P] `docs/runbook.md`: verificar el dominio, SPF/DKIM/DMARC, configurar el SMTP en el
      panel, rotar la clave en **dos** lugares, y el texto de los tres correos de identidad para
      poder reponerlo.
- [x] **T027** [P] `supabase/tests/080-donantes-y-muro.sql`: que una cuenta del público no pueda
      registrar un envío a una dirección ajena ni leer `email_deliveries`.
- [x] **T027b** Habilitación a mano (ADR-033): migración `…_account_approval.sql`,
      `review_donor_account()`, `/admin/donantes`, plantillas HTML del producto, y correos
      `account.*` / `staff.new_account`. Confirmar el correo no habilita la reserva.

**Punto de control**: el equipo ya puede recuperar su contraseña desde el sitio, que hoy se hace desde
el panel de Supabase (ADR-003, consecuencias).

---

## Fase C — El catálogo, sin reservas

**Objetivo**: que el sitio diga qué falta.

**Prueba independiente**: `/catalogo` con ítems cargados muestra qué falta y cuánto; sin Supabase se
omite con aviso.

- [x] **T028** [P] `src/domain/catalog.test.ts` **en rojo**: `remaining`, `isCovered`, que nunca dé
      negativo, y que un ítem sin valor estimado no invente ninguno.
- [x] **T029** [P] `supabase/tests/070-catalogo.sql` **en rojo**: el `check` de no-sobreventa atacado
      con un `update` de superusuario, y bajar `needed_quantity` por debajo de lo comprometido.
- [x] **T030** Migración `…_donation_catalog.sql`: enum `donation_unit`, `donation_items` con sus
      cuatro restricciones, índices, policies y la vista `donation_catalog` con `security_invoker`.
- [x] **T031** [P] `src/domain/entities/donation-item.ts` y `src/domain/catalog.ts`.
- [x] **T032** `src/domain/ports/repositories.ts` + `src/infrastructure/supabase/catalog-repository.ts`,
      consultando **la vista** con lista de columnas explícita.
- [x] **T033** `src/application/use-cases/get-catalog.ts`, con `DataResult` como los demás.
- [x] **T034** Pantalla `/catalogo` en los dos idiomas: `components/screens/catalog-screen.tsx` y
      `components/catalog/*`. Primitivos existentes (`PageHeader`, `EditorialImage`, `ReservedSpace`,
      `SecondaryAction`); **sin** lenguaje visual nuevo (ADR-032 gana sobre el mockup de tarjetas).
- [x] **T035** [P] Estados vacío, de carga y de error, diseñados los tres (principio XII).
- [x] **T036** [P] Espacio reservado con su leyenda para el ítem sin foto, y el número **exacto**
      declarado en `ESPACIOS_RESERVADOS` de `e2e/comun/revision-visual.spec.ts` (FR-212).
- [x] **T037** `/admin/catalogo`: alta, edición, publicación, foto con `alt` obligatorio. Pasa por
      `perform()` y escribe el rastro (FR-223).
- [x] **T038** [P] La traducción del error `23514` a "hay N unidades comprometidas" (US4 escenario 5).
      Sin esto, el formulario muestra un mensaje de Postgres.
- [x] **T039** [P] `content/*/catalogo.json`, `e2e/sin-datos/degradacion.spec.ts`, sitemap y
      metadata.

**Punto de control**: el sitio ya contesta "qué falta", que es la mitad del pedido.

---

## Fase D — Reservas

**Objetivo**: que pedir donar algo lo asigne, y que no se pueda donar dos veces lo mismo.

**Prueba independiente**: dos sesiones concurrentes por el último ejemplar; una gana, la otra ve un
mensaje diseñado, y nunca hay sobreventa.

- [x] **T040** [P] `src/domain/pledge-status.test.ts` **en rojo**: las cuatro transiciones legales y
      que desde un estado terminal no se sale.
- [x] **T041** [P] `supabase/tests/070-catalogo.sql` **en rojo**: **dos sesiones concurrentes** por
      la última unidad (SC-202); tope de reservas por cuenta; que un `insert` directo en
      `donation_pledges` falle por falta de privilegio; que el contador coincida con la suma de
      reservas activas después de reservar, cancelar, vencer y entregar.
- [x] **T042** [P] `supabase/tests/070-catalogo.sql`: vencimiento **sin cron** (FR-218), llamando
      `release_expired_holds()` y comprobando que `claim_donation_item()` libera lo vencido del ítem
      que va a tocar.
- [x] **T043** Migración `…_donation_pledges.sql`: la tabla con sus restricciones, `pledge_status`,
      índices, policies de propiedad, y las cuatro funciones
      (`claim_donation_item`, `cancel_donation_pledge`, `fulfill_donation_pledge`,
      `release_expired_holds`). Sin `grant insert` a nadie.
- [x] **T044** [P] `src/domain/entities/donation-pledge.ts`, `src/domain/pledge-status.ts`.
- [x] **T045** `src/domain/ports/donations.ts` + `src/infrastructure/supabase/donations-port.ts`.
- [x] **T046** `src/application/use-cases/claim-item.ts`: valida con Zod, llama la función, y
      **después** intenta el correo. El correo nunca está en la transacción.
- [x] **T047** [P] `cancel-own-pledge.ts`, `get-own-account.ts`, `update-own-profile.ts`.
- [x] **T048** `/cuenta`: mis reservas con su vencimiento, cancelar, nombre público, anonimato,
      borrar la cuenta.
- [x] **T049** El flujo de "pedir donar esto" sin sesión: guarda a dónde volver y **vuelve al mismo
      ítem** después de ingresar (US1 escenario 6).
- [x] **T050** [P] `components/catalog/conflict-notice.tsx`: el estado "alguien se adelantó",
      diseñado, con el catálogo actualizado al lado.
- [x] **T051** `/admin/donaciones`: confirmar llegada, cancelar con motivo, ver contacto. Sólo
      `donaciones.leer` / `donaciones.escribir`; `editor` no entra.
- [x] **T052** [P] Correos de reserva y aviso al equipo, enganchados a `claim-item.ts`.
- [x] **T053** El proceso de recordatorios: `pg_cron` en producción, con `reminded_at` y
      `email_deliveries` como la deduplicación que sí es permanente (FR-235, SC-210).
- [x] **T054** [P] `e2e/con-datos/catalogo.spec.ts`: reservar, conflicto, cancelar, vencimiento.
- [x] **T055** [P] Trigger de borrado de cuenta: `is_anonymous = true` y `donor_display_name = null`
      cuando `user_id` queda nulo (FR-240), con su prueba.
- [x] **T056** [P] Prueba de que registrar una donación en especie **no mueve ningún total** de
      dinero (SC-209, ADR-031).

**Punto de control**: el pedido está cumplido. Falta que se vea quién ayudó.

---

## Fase E — El muro

**Objetivo**: que quien quiera aparecer, aparezca; y que quien no, no aparezca nunca.

**Prueba independiente**: una donación con nombre aparece; una anónima no aparece en ningún lugar del
HTML servido.

- [ ] **T057** [P] `supabase/tests/080-donantes-y-muro.sql` **en rojo**: `column_privs_are` para
      `anon` sobre `donation_pledges` —**exactamente** las cinco columnas—; `user_id`, `donor_note` y
      `select *` fallando con `42501` y el mensaje `permission denied for table`; que una anónima no
      aparezca en la vista; que una reservada-no-entregada tampoco (D2).
- [ ] **T058** Migración `…_donation_wall.sql`: policy de filas para `anon`, `grant select` de las
      cinco columnas, y la vista `donation_wall` con `security_invoker`.
- [ ] **T059** `get-donation-wall.ts` + repositorio, consultando la vista.
- [ ] **T060** `/quienes-ayudaron` en los dos idiomas, con el estado vacío diseñado: "la primera
      donación abre la lista", no una página en blanco ni una lista de ejemplo.
- [ ] **T061** [P] Vista previa del muro en `/catalogo` y en `/ayudar`, con los primitivos de
      ADR-026.
- [ ] **T062** Revalidación al confirmar una llegada y al cambiar el anonimato (FR-229, SC-212).
- [ ] **T063** [P] `e2e/con-datos/catalogo.spec.ts`: que el HTML servido de todas las páginas
      públicas no contenga ningún correo ni ningún UUID de cuenta (SC-204).

---

## Fase F — Cierre

- [ ] **T064** [P] Capacidad de agente `catalogo-de-donaciones`: registro, adaptador REST y
      herramienta WebMCP. **Sin nombres y sin reservar** (FR-242).
- [ ] **T065** [P] Su prueba: que no devuelva ningún dato personal ni el valor estimado.
- [ ] **T066** [P] `docs/architecture.md` y `docs/webmcp.md` al día.
- [ ] **T067** [P] Revisar que la política de privacidad de T017 siga describiendo lo que el sistema
      hace de verdad, ahora que hace más.
- [ ] **T068** [P] `docs/testing.md`: la persona `donante` y la prueba de concurrencia.
- [ ] **T069** [P] `lighthouserc.json`: las dos páginas nuevas en los presupuestos existentes.
- [ ] **T070** [P] `supabase/fixtures/dev.sql`: ítems, reservas en cada estado, una anónima y una con
      nombre.
- [ ] **T071** Revisión visual en 360 px y 1440 px de las tres páginas nuevas, con capturas, hasta
      que el resultado sea genuinamente bueno (constitución § Loop de revisión visual).

---

## Dependencias

```
A ──▶ B ──▶ D ──▶ E ──▶ F
 └──▶ C ──────┘
```

- **A bloquea todo.** Abrir el registro sin la frontera nueva es publicar el agujero.
- **C no necesita B ni D**: el catálogo se puede publicar sin que nadie pueda reservar.
- **D usa B si está**, y funciona sin B (FR-233).
- **E necesita D**: sin reservas entregadas no hay muro.
- T017 (privacidad) va **en el mismo commit** que T008 (abrir el registro). No es una tarea de
  documentación: es una condición legal y de honestidad del despliegue.

## Dentro de cada fase

- El test va primero y **se lo ve en rojo** donde la constitución lo exige: dominio, policies y
  capacidades. Un test que nunca falló no demuestra nada.
- Migración antes del repositorio; repositorio antes del caso de uso; caso de uso antes de la
  pantalla.
- Un commit por cambio lógico, con la documentación que le corresponde **adentro del mismo commit**.
- `npm run verify` en verde antes de cada push a `main`. Para las fases con migración, también
  `npm run db:verify`.

## Lo que queda fuera, escrito para que no se descubra como olvido

Captcha · OAuth · doble factor para el público · que el público proponga ítems · logística de entrega ·
webhooks de rebotes · notificaciones que no sean por correo · valor estimado publicado (D3) ·
aprobación de reservas por la familia (D1). Cada uno tiene su motivo en `spec.md` § Assumptions o en
§ Decisiones pendientes.
