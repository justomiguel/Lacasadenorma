# Testing

Qué se prueba, en qué nivel, cómo se corre, y —lo que suele faltar en un documento como este— **qué no
se prueba y por qué**.

El principio que ordena todo el resto está en
[`specs/001-sitio-publico-campana/testing-strategy.md`](../specs/001-sitio-publico-campana/testing-strategy.md)
y conviene repetirlo acá: **se testea lo que puede lastimar a alguien**. En este proyecto eso es una
lista corta y concreta: que un CBU publicado sea el correcto, que una cifra no aparezca inventada, que
la suma del detalle dé el total, que un comprobante no se filtre, que una persona sin sesión no entre
al backoffice, y que el sitio se entienda con lector de pantalla y con el teclado.

De ahí sale un corolario que se aplica todo el tiempo: **un test que verifica que algo funciona vale
menos que uno que verifica que algo no se puede hacer.**

---

## 1. Los niveles, y qué cubre cada uno

| Nivel | Herramienta | Cuántos | Qué cubre | Qué **no** cubre |
| --- | --- | --- | --- | --- |
| Dominio | Vitest | 120 | Dinero, porcentajes, progreso, agregación de transparencia, permisos, Markdown restringido, etiquetas de auditoría | Nada que toque red o base |
| Aplicación | Vitest con dobles en memoria | 146 | Casos de uso, las quince operaciones del backoffice, las cinco capacidades, la equivalencia REST | Persistencia real |
| Infraestructura | Vitest | 49 | Redacción del logger, validación de archivos por contenido, límite de tasa, honestidad del JSON-LD | El comportamiento de Supabase |
| Componentes | Vitest + Testing Library | 64 | `CopyField`, `CountryTabs`, `Ledger`, `Figure`, fechas, la barra de ayuda y el puente WebMCP, con sus estados vacíos | Estilos, píxeles |
| Contenido | Vitest | 12 | Que los diez JSON cumplan su esquema | |
| Base de datos | pgTAP sobre PostgreSQL real | 155 | Cada combinación rol × tabla × operación, integridad financiera, storage | GoTrue y PostgREST reales |
| Punta a punta | Playwright, tres navegadores, dos modos | 532 | Los nueve flujos críticos y los criterios visuales | Rendimiento medido |
| Accesibilidad | `@axe-core/playwright` | incluidos arriba | Cero violaciones en 11 páginas × 2 viewports | Orden lógico, calidad del `alt`, sentido del texto |
| Performance | Lighthouse CI | 9 páginas × 3 corridas | Las cuatro categorías ≥ 95 y los presupuestos | |

Los totales: **391 tests en 29 archivos** con Vitest, **155 aserciones pgTAP** en 6 suites, **532
tests de Playwright** entre los dos modos (255 sin datos, 277 con datos).

### TDD, donde es obligatorio

RED → GREEN → REFACTOR no es una preferencia estilística acá; es obligatorio en tres lugares y
opcional en el resto:

| Obligatorio | Por qué |
| --- | --- |
| `src/domain/` | Un error de cálculo en el saldo publicado es un error en la rendición de cuentas |
| Policies RLS | Un test que pasa porque la policy permite todo es un test que no probó nada. Se escribe primero el caso negado |
| Capacidades para agentes | El contrato lo consume software de terceros, y una fuga se descubre desde afuera |

No se aplica en maquetación ni estilos. Ahí el mecanismo de verificación es el loop de revisión
visual, y un test que sólo re-describe el JSX no aporta nada más que trabajo cuando el JSX cambia.

### El loop de revisión visual, y qué quedó medido

Los diez criterios están en `ux.md` §12. La primera pasada completa —once páginas, dos anchos,
capturas de pliegue y de página entera— encontró tres cosas, y **ninguna de las tres se veía en una
captura**:

| Hallazgo | Cómo se veía | Cómo se encontró |
| --- | --- | --- |
| La medida de lectura decía 68 caracteres y entregaba entre 98 y 104 | Como una página normal. Un párrafo ancho no se ve ancho | Midiendo el ancho de la caja contra el ancho real del carácter en la tipografía cargada |
| La barra de ayuda del teléfono duplicaba el botón de la apertura | Como dos botones iguales, que en una maqueta parece una decisión | Contando superficies con acento sobre el pliegue |
| Las reglas del encabezado y del pie caían en una tercera extensión | 96 px de diferencia sobre 1440. A ojo, nada | Midiendo las cajas con borde de cada página |

Por eso **nueve de los catorce criterios dejaron de depender de la vista** y viven en
`e2e/comun/revision-visual.spec.ts`, que corre en las once páginas, en los tres navegadores y en los
dos modos: desborde horizontal, medida de la prosa, superficies con acento sobre el pliegue,
gradientes y sombras y esquinas redondeadas, números tabulares, proporción declarada de cada imagen,
huecos de foto reservados, texto en versales, y que la home rompa el plano. Un décimo —el anillo de
foco— vive en `accesibilidad.spec.ts`, que recorre con Tab todo lo enfocable de cada página: axe no
tiene ninguna regla de foco visible, y una utilidad `outline-none` en un componente nuevo no rompería
nada más. Y el de la navegación, en `navegacion.spec.ts`.

Los cuatro últimos los agregó [ADR-021](./adr/021-segunda-direccion-visual.md), después de que la
familia dijera que el sitio estaba monótono. Vale anotar por qué hacían falta: **la página pasaba los
diez criterios anteriores**. Cada regla se cumplía y el conjunto se leía como una plantilla, porque
ninguna medición preguntaba si había una foto, si había más de una superficie, ni dónde estaba la
navegación. Un criterio que no se puede fallar no es un criterio.

Dos de los cuatro encontraron defectos en su primera corrida, ninguno visible en una captura: el
sumario del sitio salía **sin nombre accesible** —`Container` recibía `aria-label` y lo descartaba en
silencio—, y los tres puntos de navegación del sitio se llamaban igual, o sea que desde el teclado
eran tres landmarks indistinguibles.

Lo que sigue necesitando ojos son los cuatro criterios que son un juicio y no una medida: si la
primera pantalla comunica, si el orden de lectura acompaña, si el tono es el correcto, si la página se
parece a un documento y no a un producto. Para ésos está `node scripts/screenshots.mjs`, que captura
las once páginas en los dos anchos, en pliegue y completas.

Un test no reemplaza el loop: lo deja concentrado en lo que de verdad hay que mirar.

### Cobertura

Se mide y no se persigue como número. Los umbrales están en `vitest.config.mts` y son **por área**, a
propósito:

```ts
thresholds: {
  "src/domain/**": { branches: 90, functions: 95, lines: 95, statements: 95 },
  "src/application/**": { branches: 75, functions: 85, lines: 85, statements: 85 },
},
```

Un porcentaje global alto con el dominio al 60 % sería una mentira estadística: el promedio lo levanta
la capa que menos importa.

---

## 2. Los nueve flujos críticos

Son los recorridos que, si se rompen, rompen el proyecto. Los nueve tienen cobertura automática. El
noveno necesita una sesión de administrador, y hasta dónde llega esa sesión está explicado abajo.

| # | Flujo | Dónde se verifica | Modo |
| --- | --- | --- | --- |
| 1 | Abrir la home | `e2e/comun/home.spec.ts` | los dos |
| 2 | Entender qué es la campaña | `e2e/comun/home.spec.ts` | los dos |
| 3 | Ver el progreso | `e2e/con-datos/progreso.spec.ts` | con datos |
| 4 | Elegir cómo colaborar | `e2e/con-datos/aportes.spec.ts` | con datos |
| 5 | Copiar un dato de la cuenta | `e2e/con-datos/portapapeles.spec.ts` | con datos, Chromium |
| 6 | Compartir la campaña | `e2e/comun/compartir.spec.ts` | los dos |
| 7 | Revisar la transparencia | `e2e/con-datos/transparencia.spec.ts` | con datos |
| 8 | Entrar al backoffice | `e2e/comun/admin.spec.ts` | los dos |
| 9 | Publicar una actualización | `e2e/con-datos/publicar.spec.ts` | con datos |

Los tests no comprueban que la página cargue. Comprueban afirmaciones que se pueden falsear:

- **La suma del libro de gastos es exactamente el total publicado.** Suma las filas de la tabla y las
  compara con la cifra de "Gastado" (SC-007). Si alguien cambia un cálculo, este test falla antes de
  que la incoherencia llegue a una pantalla.
- **El saldo es la resta, y el recibido no incluye lo anulado.** Un gasto anulado que siguiera contando
  sería una rendición de cuentas equivocada.
- **Lo que queda en el portapapeles es lo que estaba a la vista.** Lee `navigator.clipboard.readText()`
  y lo compara con el texto en pantalla. Es el test que protege el dato más peligroso del sitio: copiar
  un CBU distinto del que se muestra sería un desastre silencioso.
- **Los borradores y lo anulado no tienen camino de lectura pública.** Un slug de borrador adivinado
  responde 404, no 200 (amenaza I7).
- **Dice cuántos comprobantes hay y no publica los archivos.** La ruta del comprobante responde 403 sin
  sesión, sin seguir redirects (FR-013, SC-008).
- **Cada página se puede compartir con título, descripción y canónica.** Once páginas, y además la
  imagen de la vista previa se descarga y se verifica que sea una imagen de verdad (SC-011).
- **Sin JavaScript los tres países vienen completos en el HTML.** Con el JS deshabilitado, las tres
  cuentas están servidas: el selector de país es una mejora, no un requisito (FR-025).

### El flujo 9 y dónde está el límite de la sesión emulada

Publicar una actualización necesita una sesión de administrador. Durante un tiempo eso lo dejó fuera de
la suite: la API local era PostgREST sobre el Postgres local, sin GoTrue, y la conclusión —correcta
mientras duró— era que un servidor de autenticación falso terminaría verificando el servidor falso.

`scripts/local-api.mjs` ahora emite sesiones, y lo que cambió no es esa conclusión sino **dónde cae el
límite**. Lo que el flujo 9 recorre es la cadena de autorización de verdad:

- La contraseña se compara con bcrypt contra `auth.users.encrypted_password`, con
  `extensions.crypt()`, igual que la guarda la plataforma.
- Los claims del token los arma `public.custom_access_token_hook`, la función de la migración,
  invocada **con el rol `supabase_auth_admin`**: los mismos privilegios que tiene el servidor de auth
  en el proyecto real.
- El token se firma con el secreto que valida PostgREST, así que las policies RLS deciden cada lectura
  y cada escritura de la sesión.
- `GET /auth/v1/user` verifica la firma HMAC y el vencimiento. No es un detalle de prolijidad:
  `getClaims()` de supabase-js, con un token HS256, delega la verificación justamente en esa ruta, y si
  contestara 200 sin mirar la firma, la propiedad que la prueba dice comprobar sería falsa. Hay una
  aserción que fabrica un token con `user_role: owner` y comprueba que la API lo rechace.

Lo sustituido es la superficie HTTP de GoTrue y la administración de la sesión —emitir, rotar y vencer
refresh tokens, que en el shim viven en memoria del proceso—. Es transporte; no es donde se decide una
autorización.

**Esto rindió antes de la primera aserción.** Montar la emisión de tokens contra el hook real descubrió
que `supabase_auth_admin` no tenía `usage` sobre el esquema `private` y que ninguna sesión se habría
podido emitir en producción (migración `20260910090000`). Recorrer el flujo descubrió el segundo:
publicar una novedad como `editor` dejaba la fila publicada, no escribía la entrada de auditoría y
mostraba un error (ADR-019). Los dos defectos estaban en la costura entre pgTAP y las pruebas de
aplicación: pgTAP verificaba que la policy fuera la del documento —y lo era— y la capa de aplicación
usa un puerto en memoria que acepta cualquier entrada.

Lo que el flujo 9 afirma, en cuatro pruebas y en los tres proyectos:

- Entrar como `editor`, escribir un borrador, comprobar que **no** tiene camino público antes de
  publicar, publicarlo, y encontrarlo en su URL con su canónica, en la lista y en `/sitemap.xml` —las
  tres invalidaciones de ADR-017—. Y después despublicarlo y comprobar que vuelve a dar 404: publicar
  por error tiene que ser reversible de verdad, no sólo desaparecer de la lista.
- La publicación queda en el registro de auditoría, escrita con un rol y leída con otro.
- Un `auditor` no publica: la pantalla lo manda al aviso de permiso insuficiente, y la base rechaza el
  `update` **aunque se le hable directamente con su sesión real**, salteando la interfaz entera. Que un
  botón no aparezca no prueba que la operación esté prohibida.
- El backoffice con sesión cumple WCAG 2.2 AA. Antes esto no se podía comprobar: sin sesión, axe sólo
  llegaba a la pantalla de acceso.

Los tres proyectos escriben en la misma base, así que cada prueba trabaja sobre una novedad con su
propio `slug`, derivado del nombre del proyecto y del reloj.

Sigue siendo cierto que el shim no es Supabase: el comportamiento de GoTrue ante una contraseña débil,
la recuperación de contraseña, el rate limiting y el hook configurado en el panel se verifican contra
el proyecto real, y están en el runbook.

---

## 3. Accesibilidad

`e2e/comun/accesibilidad.spec.ts` corre axe sobre las **once páginas públicas** en **dos viewports** —el
del proyecto y 360 px— con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`. Cero
violaciones, sin excepciones configuradas.

Además, tres cosas que axe no detecta y que se verifican aparte:

- **La primera tabulación de cada página lleva al contenido.** El salto tiene que existir y tiene que
  funcionar, no sólo estar en el DOM.
- **Cada página tiene un `h1` y la jerarquía de encabezados no salta niveles.**
- **Con "reducir movimiento" activo no queda ninguna transición larga.** Se lee el CSS computado, no la
  intención.

Lo que axe no puede ver sigue siendo responsabilidad de la revisión manual: si el orden de lectura
tiene sentido, si el `alt` de una foto aporta información o la repite, si el texto de un enlace se
entiende fuera de contexto. Eso se revisa en el loop visual, no acá.

Dos hallazgos reales que salieron de esta suite, para que quede claro que no es decorativa: el tercer
nivel de tinta del sistema de diseño no llegaba a 4,5:1 sobre el papel —se corrigió el token, no el
test— y la lista de rubros del presupuesto tenía un `<div>` de más entre el `<dl>` y sus `<dt>`, que
invalida la lista para un lector de pantalla.

---

## 4. Cómo se corre

```bash
npm test                     # unitarios, de componente y de contenido (~6 s)
npm run test:watch           # lo mismo, en watch
npm run test:coverage        # con cobertura y umbrales por área

npm run test:e2e             # los dos modos, uno después del otro (~6 min)
npm run test:e2e:sin-datos   # sólo el sitio sin base de datos
npm run test:e2e:con-datos   # sólo el sitio con la base local y el fixture

npm run db:test              # las seis suites pgTAP sobre una base recreada
npm run db:verify            # reset + lint + advisors + pgTAP + tipos

npm run verify               # la compuerta completa de CI
```

`verify` corre `test:coverage` y no `test`, aunque tarde unos segundos más. La diferencia importa: CI
sí mide los umbrales, así que con `test` a secas se podía tener `verify` en verde y el pull request en
rojo por cobertura. Una compuerta local que no reproduce la de CI no es una compuerta, es una
sugerencia.

Para iterar sobre un test de Playwright sin reconstruir el sitio en cada corrida:

```bash
E2E_REUSAR=1 npm run test:e2e:con-datos -- --project=escritorio e2e/con-datos/aportes.spec.ts
```

`E2E_REUSAR=1` reusa el build y la base que ya están. Si el build que hay en `.next` no es del modo
pedido, el script **corta con un error** en lugar de correr: un build del otro modo pasa la mayoría de
los tests y falla los tres que miran las URL canónicas, que es la peor forma de fallar porque nadie
sospecha del build.

La primera vez hay que instalar los navegadores:

```bash
npx playwright install --with-deps
```

---

## 5. Los dos modos, y por qué son dos builds

Esta es la parte del harness que hay que entender antes de tocarlo.

**Next reemplaza las variables `NEXT_PUBLIC_*` por su valor durante la construcción.** No las lee al
arrancar: las inlinea en el JavaScript. Entonces "el sitio con base de datos" y "el sitio sin base de
datos" no son dos configuraciones del mismo servidor, son **dos builds distintos**. Playwright sabe
levantar servidores, no construirlos con entornos diferentes, así que la preparación vive en
`scripts/e2e.sh` y el modo llega a `playwright.config.ts` por `E2E_MODO`.

| | `sin-datos` | `con-datos` |
| --- | --- | --- |
| Puerto | 3210 | 3211 |
| PostgreSQL | no hace falta | requerido |
| Preparación | ninguna | `db-local.sh reset` + `fixture` + API local arriba, y recién entonces el build |
| Variables de Supabase | vacías y exportadas | apuntando a la API local |
| Servidores | `next start` | `next start` + `node scripts/local-api.mjs` |
| Suites | `e2e/comun/` + `e2e/sin-datos/` | `e2e/comun/` + `e2e/con-datos/` |
| Verifica | FR-034, SC-012: la ausencia explicada | Los flujos 3, 4, 5 y 7 |

Detalles que parecen menores y no lo son:

- **Las variables van vacías y exportadas, no ausentes.** En una máquina de desarrollo `.env.local`
  tiene la base configurada y Next la leería; una variable vacía gana sobre el archivo, y
  `readSupabaseConfig()` la trata como ausente. Sin esto, el modo sin datos dejaría de probar lo único
  que existe para probar.
- **Siempre `next start`, nunca `next dev`.** El servidor de desarrollo volvería a leer `.env.local`, y
  además no minifica ni comprime: mediría un sitio que nadie visita.
- **`NEXT_PUBLIC_SITE_URL` se fija al puerto del modo.** La canónica, el sitemap, el JSON-LD y la
  imagen de compartir se derivan de ahí; sin fijarla, las afirmaciones del flujo 6 medirían la URL de
  otra máquina.
- **La huella del build.** `scripts/e2e.sh` anota en `.next/e2e-modo` el modo, la URL y el `BUILD_ID`.
  Cualquier `npm run build` —incluido el de `npm run verify`— cambia el identificador, así que la
  comprobación de `E2E_REUSAR` falla en lugar de dar por bueno lo que hay.
- **La API local se levanta antes de construir, no después.** Es el orden y es lo que más cuesta ver
  cuando se rompe. Casi todas las páginas públicas son estáticas con `revalidate = 300`: Next las
  prerenderiza **durante el build**, leyendo la base. Con la API abajo en ese momento, cada página se
  hornea con la rama del dato ausente —correcta, pero sin una sola cifra— y la entrada de caché queda
  *fresca* cinco minutos, así que Next no la revalida y sirve la versión vacía toda la corrida, que dura
  menos que eso. Se ve como veintitrés fallos de flujos 3, 4, 5 y 7 que parecen de la aplicación.
  Levantarla antes también hace que el build local se parezca al de producción, donde Vercel construye
  con Supabase disponible.
- **La API local se reusa si ya está levantada, el sitio no.** PostgREST no depende del build y apunta a
  la misma base que acabó de migrar el script; el servidor del sitio sí depende del build, y reusarlo
  sería reusar el build anterior. Ese "se reusa" es también lo que escondía el problema anterior: en una
  máquina donde alguien ya tenía la API arriba, el build agarraba datos y la suite pasaba; en un runner
  limpio de CI, nunca.
- **La caché de fetch se borra antes de construir**, y esto tardó en aparecer porque contradice lo que
  uno supone del build. Next guarda **en disco**, en `.next/cache/fetch-cache`, cada lectura de Supabase:
  el cliente lee por `fetch` y Next lo instrumenta. Las entradas duran la ventana de `revalidate` —cinco
  minutos— y **sobreviven al build siguiente**, así que dos builds separados por menos de eso hornean
  los mismos datos y el segundo no consulta la base. Si el primero corrió con la base vacía —el de
  `npm run verify` después de un `db:verify`, que hace `reset` sin fixture, o el de una corrida que
  falló—, el segundo hornea las once páginas sin una sola cifra con el fixture cargado y la API
  contestando. Está medido: mismo fixture, misma API, mismo entorno, y la única diferencia entre la
  página vacía y la página completa fue borrar ese directorio. Vale saberlo fuera del harness también,
  porque Vercel restaura la caché de build entre despliegues: un deploy puede prerenderizar cifras
  leídas hasta cinco minutos antes. Para el sitio es inocuo —la página revalida sola—, pero explica una
  cifra que llega vieja a un despliegue recién hecho.
- **Y después de construir, el script mira lo construido.** Todo lo anterior comprueba condiciones; esto
  comprueba el resultado, que es lo único que no puede estar bien por casualidad. Las cuatro páginas con
  cifras tienen que traer al menos un `data-figure` en su HTML prerenderizado, o el script corta con un
  error que dice qué pasó y qué mirar. Hace falta porque el modo de falla es silencioso **por diseño**:
  cuando una lectura no trae nada la página muestra la rama del dato ausente en lugar de romperse
  (FR-034), y eso, que en producción es lo correcto, acá deja que la corrida gaste seis minutos para
  devolver veinte pruebas rojas que parecen defectos de la aplicación. Pasó, y de ahí salió la guardia.

### Los tres navegadores

| Proyecto | Dispositivo | Qué excluye |
| --- | --- | --- |
| `escritorio` | Desktop Chrome, con permiso de portapapeles | — |
| `movil` | iPhone 15 | el flujo 5 |
| `safari` | Desktop Safari | el flujo 5 |

El flujo del portapapeles corre sólo en Chromium: es el único navegador que concede el permiso sin
intervención. El valor sigue siendo seleccionable a mano en todos, y eso **sí** se verifica en los
tres, porque es lo que salva a quien no tiene el permiso.

WebKit dio un hallazgo que vale documentar porque costó encontrarlo: 44 tests fallaban en `safari` y
`movil` con violaciones de contraste y de tamaño de objetivo que no existían. La causa era
`upgrade-insecure-requests` en la CSP. Chromium exceptúa los orígenes locales; WebKit no, así que
pedía la hoja de estilos, las fuentes y todo el JavaScript por https contra un servidor que habla
http. La página se servía entera y sin estilos, los objetivos táctiles medían 22 px, y axe reportaba
docenas de violaciones reales de una página que en producción no existe. `next.config.ts` omite esa
directiva —y `Strict-Transport-Security`— cuando el sitio se sirve por http.

---

## 6. La base de datos: pgTAP

Seis suites, 155 aserciones, sobre PostgreSQL 17 real con un shim que emula lo que Supabase agrega
([ADR-013](./adr/013-base-datos-local.md)). Sin Docker.

| Suite | Aserciones | Qué verifica |
| --- | --- | --- |
| `010-estructura.sql` | 36 | RLS habilitado en todas las tablas expuestas, índices, vistas con `security_invoker`, ningún grant prohibido, `record_audit` con `security definer` |
| `020-lectura-publica.sql` | 23 | Qué puede y qué no puede leer `anon`: nada de aportes, nada de comprobantes, ningún borrador |
| `030-matriz-de-permisos.sql` | 33 | La matriz completa rol × tabla × operación, y quién puede agregar al rastro de auditoría |
| `040-integridad-financiera.sql` | 26 | Que no se pueda borrar un registro financiero, que `audit_log` sea append-only, los CHECK |
| `050-roles-y-token.sql` | 21 | Que el rol venga de `app_metadata`, que `user_metadata` se ignore, y que el servidor de auth pueda ejecutar el hook |
| `060-storage.sql` | 16 | `fotos` público, `comprobantes` privado, y las policies de cada uno |

La forma de estos tests es distinta de la del resto: casi todos afirman que una operación **falla**.
`030-matriz-de-permisos.sql` recorre cinco roles contra trece tablas y cuatro operaciones, y la mayoría
de sus aserciones esperan un rechazo. Es lo que hace que agregar una tabla sin policies rompa el
build en lugar de exponerla.

Lo que el shim no puede verificar, y por eso no se da por probado: el comportamiento de GoTrue, que el
hook esté **configurado** en el panel del proyecto, las URL firmadas de Storage y `supabase db push`
contra el proyecto real. La compuerta de eso es `supabase db advisors --linked`, en el despliegue.

Que el hook *funcione* sí se verifica, y en dos niveles: `050` lo invoca con el rol
`supabase_auth_admin`, y el flujo 9 emite un token con él y lo usa contra PostgREST. Esa aserción de
`050` existe porque no existía: el hook fallaba con `permission denied for schema private` en cuanto lo
llamaba el rol que lo llama de verdad, y ninguna sesión se habría podido emitir en producción.

---

## 7. Lo que corre en CI

| Workflow | Job (el nombre que se pide en la protección de rama) | Qué protege |
| --- | --- | --- |
| `ci.yml` | `Todo lo que rompe el merge` | Tipos, reglas de capas, formato, 391 tests, cifras de relleno, secretos en el bundle, build |
| `ci.yml` | `Riesgo conocido en las dependencias` | `npm audit` |
| `e2e.yml` | `sin-datos · flujos críticos y accesibilidad` | El sitio sin credenciales |
| `e2e.yml` | `con-datos · flujos críticos y accesibilidad` | Los flujos con cifras |
| `quality.yml` | `Presupuestos de performance, accesibilidad y SEO` | Lighthouse, nueve páginas |
| `db.yml` | `Migraciones, advisors y policies RLS` | Migraciones, `db lint`, advisors, pgTAP |

Tres decisiones del harness de CI que conviene conocer antes de editarlo:

- **`fail-fast: false` en la matriz de E2E.** Si los dos modos se rompen, hace falta ver los dos.
  Cancelar el segundo esconde la mitad del diagnóstico y obliga a otra corrida.
- **`check:secrets` corre después del `build`.** El script mira los archivos de `.next/static`, o sea
  el JavaScript que llega al navegador. Sin build previo avisa que omite la revisión y sale en verde:
  la comprobación más importante quedaría desactivada sin que nadie se entere.
- **`db.yml` está separado.** Instalar PostgreSQL 17 con pgTAP tarda minutos y sólo puede cambiar de
  resultado si cambia el esquema. La instalación está en una acción compuesta
  (`.github/actions/postgres-local`) que comparte con el job `con-datos` de E2E, para que la receta
  viva en un solo lugar.

Ni los E2E ni Lighthouse usan credenciales de Supabase, y es deliberado: correr la suite en modo sin
datos es la única verificación automática de que la degradación funciona. Si algo falla ahí se arregla
la página o el test; **no** se agregan secretos a esos workflows.

---

## 8. Cuando un test falla

| Síntoma | Primero mirá |
| --- | --- |
| Un test de Playwright falla sólo en CI | El reporte HTML del artefacto `playwright-<modo>-<run_id>`, que se sube sólo en fallo y se retiene 7 días |
| Falla en `safari` o `movil` y no en `escritorio` | Si la página se está sirviendo con estilos. Un fallo de CSP o de assets se ve como docenas de violaciones de axe |
| Fallan los tests de canónica y nada más | El build. Corré sin `E2E_REUSAR=1` |
| `EADDRINUSE` en 54321 | Ya hay una API local levantada. Está bien: se reusa. Si no responde, `ss -ltnp \| grep 54321` |
| Un test de axe falla con `color-contrast` | Es un bug del token, no del test. Los contrastes medidos están en `ux.md` |
| Fallan casi todos los tests de los flujos 3, 4, 5 y 7 a la vez, con timeouts | El sitio se construyó sin datos. La API local tiene que estar arriba **antes** del build (sección 5); mirá que `scripts/e2e.sh` la haya levantado y no haya fallado la sonda |
| pgTAP falla en una aserción de rechazo | Alguien agregó una policy más permisiva, o una tabla sin policies |
| `npm run verify` pasa y `test:e2e` no | Casi siempre el build: `verify` construye con el entorno de la máquina, `e2e.sh` con el del modo |
