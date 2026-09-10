# Runbook

Procedimientos operativos: levantar cada entorno, dar y quitar acceso, conciliar, verificar a mano lo
que no se puede automatizar, y qué hacer cuando algo falla.

Está escrito para que alguien que no participó del desarrollo pueda ejecutarlo. Si un paso requiere
saber algo que no está acá, es un defecto de este documento.

---

## 1. Los tres entornos, y para qué sirve cada uno

| Entorno | Qué se puede hacer | Qué **no** |
|---|---|---|
| **Sin credenciales** — `npm install && npm run dev` | Leer el sitio entero, escribir contenido, trabajar el diseño, correr los E2E en modo `sin-datos` | Ver cifras: el sitio explica por qué no las muestra |
| **PostgreSQL local + API local** | Todo lo anterior más cifras, hitos, novedades, transparencia, iniciar sesión en `/admin` con los usuarios del fixture, y los E2E en modo `con-datos` | Subir comprobantes: no hay Storage. Recuperar contraseña, límites de tasa de GoTrue |
| **Proyecto de Supabase real** | Todo, con GoTrue y Storage de verdad: subida de comprobantes, enlaces firmados, el hook configurado en el panel | — |

La progresión es deliberada. La mayoría del trabajo se hace en el primero, que no necesita nada. El
tercero se usa sólo para lo que de verdad lo requiere.

---

## 2. La base de datos local sin Docker

Este entorno no tiene Docker, así que no se usa `supabase start`. En su lugar: un PostgreSQL de `apt`,
el shim de `supabase/shim/` que recrea la parte de la plataforma que las migraciones asumen, y los
comandos del CLI de Supabase que aceptan `--db-url` (ADR-013).

### Preparar la máquina, una vez

```bash
sudo apt-get install --yes postgresql-17 postgresql-17-pgtap postgresql-17-plpgsql-check
sudo apt-get install --yes libtap-parser-sourcehandler-pgtap-perl   # trae pg_prove
npm run db:bootstrap     # crea el rol y las bases; pide sudo una vez
```

Los tres paquetes de PostgreSQL vienen del repositorio oficial de PostgreSQL, no del de Ubuntu.
`plpgsql_check` es lo que `supabase db lint` habilita por debajo, y `pg_prove` es el runner de TAP que
corre los archivos de `supabase/tests/`: no viene con pgTAP. Los pasos exactos, incluido el de liberar
el puerto 5432 que reserva el PostgreSQL preinstalado, están en
`.github/actions/postgres-local/action.yml`, que es lo que corre en CI.

`db:bootstrap` crea el rol `norma_local` y dos bases: `norma_dev` para trabajar y `norma_test` para
pgTAP. El rol es superusuario porque las migraciones crean esquemas, roles y funciones `security
definer`, que es exactamente lo que hace la plataforma con su propio rol. La credencial
`norma_local:norma_local` no es un secreto: no existe fuera de esta máquina y el esquema se borra
entero en cada reset.

### El ciclo de trabajo

```bash
npm run db:reset        # recrea norma_dev desde cero y aplica las migraciones
npm run db:fixture      # carga el fixture de desarrollo
npm run api:local       # levanta PostgREST en la forma que espera supabase-js
```

`api:local` imprime la URL y la clave anónima. Van a `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<la que imprime el script>
```

Y en otra terminal, `npm run dev`.

La clave que imprime es un JWT firmado con un secreto de desarrollo escrito en el propio script.
Tampoco es un secreto: sólo sirve contra esta base.

### Por qué existe la API local y no sólo la base

La base alcanza para pgTAP, pero no da **PostgREST**, y sin PostgREST el código que de verdad se
despliega —los repositorios de `src/infrastructure/supabase/`— no se ejecuta nunca fuera de
producción. Sus mapeadores, sus `select` con columnas nombradas y su manejo de errores quedarían sin
verificar hasta el primer despliegue, que es el peor momento para descubrir que una columna no
existe.

`/auth/v1` responde 501 con un mensaje explícito en lugar de fallar raro. Es una limitación conocida,
no un bug.

### El fixture

`supabase/fixtures/dev.sql` se aplica **sólo** cuando alguien lo pide con `npm run db:fixture`: nunca
desde `reset`, nunca desde `migrate`, nunca desde el despliegue. Y no se llama `seed.sql` a propósito,
porque ese nombre lo aplica el CLI solo (ADR-015).

Sus datos bancarios no tienen forma de datos bancarios: son la cadena `CUENTA DE PRUEBA — NO
TRANSFERIR`. Si el fixture llegara por error a un entorno público, el error se vería en la primera
pantalla en lugar de pasar desapercibido. Un dato falso disfrazado de verdadero es el fallo; uno que
grita que lo es sirve de alarma. Y la base lo rechaza igual: hay una restricción que prohíbe
marcadores de relleno en las cuentas.

### Verificar el esquema

```bash
npm run db:verify       # reset + lint + pgTAP + types --check. Es lo que corre en CI
npm run db:test         # sólo las pruebas pgTAP, sobre una base recreada
npm run db:advisors     # advisors de seguridad y performance
npm run db:types        # regenera src/infrastructure/supabase/database.types.ts
```

`db:verify` es la compuerta antes de tocar el esquema. Los tipos se generan, no se editan: una
corrección a mano se pierde en la próxima generación, y por eso el archivo está en el ignore del
linter.

### Qué no cubre

El shim es parcial: no hay GoTrue —la API local emite sesiones, pero no es GoTrue—, ni PostgREST
completo con sus extensiones, ni Realtime. Una migración
puede pasar en `db.yml` y comportarse distinto en el proyecto real. La compuerta verdadera es
`supabase db push --dry-run` y `db advisors --linked` contra el proyecto, y está en
[`deployment.md`](./deployment.md#5-cómo-llegan-las-migraciones-a-producción).

---

## 3. Un proyecto de Supabase real

Hace falta para lo que la API local no puede sustituir: la subida de comprobantes, los enlaces
firmados, el comportamiento de GoTrue —recuperación de contraseña, políticas de contraseña, límites de
tasa— y que el hook de roles esté efectivamente habilitado en el panel. El backoffice y la sesión se
pueden recorrer con la base local (sección 2). Se recomienda un proyecto aparte del de producción.

### Crear y conectar

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push --dry-run     # leer el SQL entero antes de aplicarlo
npx supabase db push
npx supabase db advisors --linked --type all --level warn
```

### Variables

En `.env.local`, y con esto alcanza para el sitio público y el login:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave publicable>
SUPABASE_SECRET_KEY=<clave secreta>
```

La clave secreta es **sólo del servidor**. Nunca lleva prefijo `NEXT_PUBLIC_`, porque ese prefijo es
literalmente la instrucción de incrustarla en el JavaScript del navegador. `npm run check:secrets`
revisa el bundle construido para asegurarse de que ninguna clave del servidor terminó ahí, y por eso
tiene que correr **después** del build.

### Habilitar el hook de roles

Crear la función no alcanza. El `custom_access_token_hook` hay que habilitarlo en el panel:
**Authentication → Hooks → Custom Access Token**, apuntando a `public.custom_access_token_hook`
(ADR-004).

Sin ese paso, el rol nunca llega al token, y el resultado no es un error visible: es que quien inicia
sesión entra sin permisos y las pantallas del backoffice le dicen que no tiene acceso. Si eso pasa, es
el primer lugar donde mirar.

### Crear la primera persona

1. **Authentication → Users → Add user**, con correo y contraseña.
2. Copiar su `id`.
3. En el **SQL Editor**, darle el rol:

```sql
insert into public.user_roles (user_id, role)
values ('<el uuid del usuario>', 'owner');
```

4. **Iniciar sesión de cero.** El rol viaja en el token, y el token se emite al iniciar sesión: una
   sesión abierta antes del `insert` sigue sin el rol hasta que se renueve.

El primer `owner` se crea así, con SQL, y es deliberado: no hay pantalla de auto-registro ni un primer
usuario privilegiado por defecto. Un formulario público que crea el primer administrador es una puerta
que queda abierta para siempre.

---

## 4. Migraciones

```bash
npm run db:new nombre_descriptivo    # crea el archivo con su timestamp
# escribir el SQL
npm run db:verify                    # aplica desde cero y corre pgTAP
```

Reglas que no se negocian:

- **Nunca se edita una migración ya aplicada en producción.** Se escribe otra.
- **Una migración destructiva necesita plan de rollback escrito antes de aplicarse.** Un `drop column`
  aplicado ya se llevó los datos, y no hay revert que los traiga.
- **Toda tabla nueva lleva RLS habilitada y sus policies en la misma migración.** Una tabla con RLS
  sin policies niega todo, que es el fallo seguro; una tabla sin RLS lo permite todo, que es el otro.
- **Toda policy nueva lleva su prueba de pgTAP**, y la prueba tiene que verificar que el rol anónimo
  **no** pueda lo que no debe. Verificar sólo el camino feliz deja pasar exactamente el error que
  importa.

Cómo llegan a producción, con el simulacro y la aprobación humana, está en
[`deployment.md`](./deployment.md#5-cómo-llegan-las-migraciones-a-producción).

---

## 5. Dar y quitar acceso

No hay pantalla para esto, y es una decisión (ADR-004): otorgar un rol es la operación más sensible del
sistema, se hace pocas veces, y una pantalla que la haga fácil es una pantalla que la puede hacer un
atacante que consiguió una sesión de `admin`.

### Dar un rol

```sql
insert into public.user_roles (user_id, role)
values ('<uuid>', 'editor');
```

Los cuatro roles, de menor a mayor:

| Rol | Para qué |
|---|---|
| `auditor` | Revisar la rendición y pedir acceso temporal a los comprobantes. No escribe nada |
| `editor` | Cargar y publicar novedades, hitos y fotos |
| `admin` | Todo lo anterior más aportes, gastos, objetivos y cuentas de aporte |
| `owner` | Todo, incluida la conciliación |

Quien recibe el rol tiene que **cerrar sesión y volver a entrar**. El rol viaja en el token.

### Quitar un rol

```sql
delete from public.user_roles
 where user_id = '<uuid>' and role = 'editor';
```

Quitarlo de la tabla no invalida un token ya emitido. Si el motivo es que la persona dejó el equipo o
se sospecha de la cuenta, hay que además **cerrarle las sesiones**: Authentication → Users → la
persona → Sign out. Y si se sospecha de la cuenta, cambiarle la contraseña primero.

### Verificar quién tiene qué

```sql
select u.email, r.role, r.granted_at
  from public.user_roles r
  join auth.users u on u.id = r.user_id
 order by r.granted_at;
```

Conviene mirar esta lista cada tanto. Un rol que se dio para una tarea puntual y quedó es la forma más
común de que el mínimo privilegio se degrade sin que nadie decida nada.

---

## 6. La conciliación semanal

Es la operación que sostiene la confianza. Una vez por semana, una persona con rol `owner`:

1. Abre el resumen del banco.
2. Registra en `/admin/aportes` los aportes que entraron, con su fecha y su referencia de
   conciliación.
3. Registra en `/admin/gastos` los gastos, y **sube el comprobante de cada uno**.
4. Marca la fecha de conciliación.
5. Abre `/transparencia` como cualquier visitante y verifica que el total coincida con el banco.

El paso 4 es el que se olvida y el que más se nota. La fecha de la última conciliación está publicada
en el sitio: si queda vieja, la página dice sola que hay atraso. Es a propósito — un número sin fecha
no es un dato, y una campaña que no publica movimiento se lee como que algo salió mal.

Si la suma del detalle no coincidiera con el total publicado, sería un error de cálculo y no de carga:
los totales se calculan, no se escriben a mano, y hay pruebas que lo verifican. En ese caso no se
corrige el número: se abre un issue.

---

## 7. El flujo 9 contra el proyecto real

El flujo crítico 9 —**publicar una actualización**— **está automatizado**:
`e2e/con-datos/publicar.spec.ts` lo recorre en los tres navegadores con una sesión real, y lo que
sustituye es sólo la superficie HTTP de GoTrue. La contraseña la verifica bcrypt en la base, los claims
los arma el `custom_access_token_hook` de la migración invocado como `supabase_auth_admin`, y el token
lo valida PostgREST, así que las policies RLS deciden cada escritura del recorrido. El detalle de dónde
cae ese límite está en [`testing.md`](./testing.md#el-flujo-9-y-dónde-está-el-límite-de-la-sesión-emulada).

Así que esta sección ya no es "el flujo 9 a mano". Es **la lista corta de lo que la suite no puede
afirmar**, y sigue siendo obligatoria antes de cada despliegue que toque `/admin`, la autenticación,
Storage o las policies. Requiere el entorno de la sección 3.

| # | Qué verificar | Por qué no lo cubre la suite |
|---|---|---|
| 1 | **Iniciar sesión con GoTrue de verdad**, con una cuenta `editor` creada desde el panel | La API local emite los tokens; GoTrue tiene su propia validación de contraseña, sus límites de tasa y sus mensajes |
| 2 | Que el rol aparezca en el marco del backoffice | Confirma que el hook está **habilitado en el panel** y no sólo creado en el esquema. Si dice que no hay permisos, mirar la sección 3 antes que cualquier otra cosa |
| 3 | **Subir una foto a una novedad**, con su descripción | No hay Storage local: el shim no tiene `storage.objects` funcional ni URLs firmadas |
| 4 | **Abrir un comprobante desde `/admin/transparencia`** | Ídem: el enlace firmado y su vencimiento sólo existen en el proyecto real |
| 5 | **Publicar y ver la vista previa al compartir.** Pegar el enlace en un chat de WhatsApp con uno mismo: título, descripción e imagen | La suite verifica las etiquetas y que la imagen sea una imagen; cómo las renderiza WhatsApp no es verificable desde un test |
| 6 | Que `/sitemap.xml` en el dominio real incluya la novedad | La suite lo verifica contra la API local. Acá lo que se prueba es la caché de Vercel, no la invalidación de Next |

Lo que **no** hace falta repetir a mano, porque la suite lo afirma en cada corrida: que un borrador dé
404, que la publicación aparezca en la lista y en el sitemap, que despublicar la vuelva a sacar del
sitio, que la publicación quede en el registro de auditoría escrita con un rol y leída con otro, y que
un `auditor` no logre publicar ni salteando la interfaz y hablándole directo a la base con su sesión.
Ese último era el paso que más importaba de la lista vieja y el que más se salteaba.

Cuando cambie algo de este camino, se actualiza esta lista. Una verificación manual que quedó vieja es
peor que ninguna: se ejecuta, pasa, y no verifica lo que se cambió.

---

## 8. Diagnóstico

### El sitio no muestra cifras

```bash
curl -s https://<dominio>/api/health
```

`dataSource` dice qué está pasando:

| Valor | Qué significa | Qué hacer |
|---|---|---|
| `supabase` | Hay base de datos y el sitio la está leyendo | El problema es de datos: mirar si están cargados y publicados |
| `content-only` | El sitio arrancó **sin credenciales** | Faltan las variables en Vercel, o el build se hizo sin ellas. Las `NEXT_PUBLIC_*` se incrustan en build: cargarlas no alcanza, hay que redeployar |

Ese último punto es la causa más probable y la menos intuitiva. Cambiar una variable `NEXT_PUBLIC_*`
en Vercel no tiene efecto hasta el próximo build.

### Una página falla

Los logs son JSON estructurado, en Vercel → Deployment → Functions. Cada entrada trae nivel, mensaje,
servicio y contexto, con las claves sensibles redactadas —tokens, cookies, correos, CBU, alias, y
varias más— antes de escribirse.

El sitio no muestra errores técnicos a quien lo visita. Cuando un dato no está disponible, la página
dice que no está disponible y por qué; el detalle va al log. Así que si alguien reporta "no se ve el
total", el mensaje que vio **no** es el error: hay que buscarlo en los logs.

### Algo cambió y no se ve

Las páginas con cifras revalidan cada 300 segundos, y publicar invalida las rutas afectadas. Si pasó
más de eso:

1. `curl -s https://<dominio>/api/health` para ver si el despliegue es el que se espera (`version` trae
   el SHA del commit).
2. Verificar en el backoffice que el registro esté **publicado** y no en borrador.
3. Revisar los logs por errores de mapeo: una columna que cambió de nombre produce
   `unavailable("error")` en la página y el detalle en el log.

### Los E2E fallan y localmente pasan

```bash
npm run test:e2e:sin-datos
npm run test:e2e:con-datos
E2E_REUSAR=1 ./scripts/e2e.sh con-datos --project=escritorio e2e/con-datos/portapapeles.spec.ts
```

`E2E_REUSAR=1` reusa el build y la base en lugar de rehacerlos, que es lo que hace tolerable iterar
sobre un test. En CI nunca se usa. Si el build que hay no es del modo pedido, el script corta con un
error en lugar de correr los tests contra el sitio equivocado.

El detalle de los dos modos y de los tres navegadores está en [`testing.md`](./testing.md).

---

## 9. Incidentes

Por orden de gravedad.

### Un dato bancario publicado está mal

Es el peor incidente posible: manda dinero de otra persona a un desconocido.

1. **Despublicar la cuenta desde `/admin` inmediatamente.** No esperar a tener el dato correcto: una
   cuenta despublicada deja de aparecer, y `/ayudar` explica que ese método no está disponible.
2. Corregir el dato, verificarlo **contra el homebanking**, y recién entonces publicarlo.
3. Revisar si alguien transfirió al dato equivocado y, si pasó, avisar y ayudar a reclamar.
4. Publicar una novedad diciendo qué pasó. Ocultarlo cuesta más que contarlo.

### Un secreto expuesto

Revocar primero en el proveedor, crear el reemplazo, actualizarlo donde corresponda, redeployar. Un
token revocado rompe el despliegue, que es un problema mucho más chico que un token vivo en manos
ajenas. El detalle está en [`deployment.md`](./deployment.md#6-volver-atrás).

Si el secreto llegó a un commit, rotarlo **igual**: el historial de Git es público y quitarlo del
código no lo quita de la historia.

### Una cuenta comprometida

1. Authentication → Users → la persona → cambiar la contraseña y cerrar sus sesiones.
2. Quitarle los roles (sección 5).
3. Revisar `/admin/auditoria` por lo que hizo esa cuenta: qué se publicó, qué se anuló, qué
   comprobantes se pidieron.
4. Revertir lo que corresponda. Los registros se anulan con motivo, no se borran: una anulación sin
   motivo es un borrado disfrazado, y la base no la acepta.

### El sitio está caído

Vercel → Deployments → el último que estaba bien → *Promote to Production*. Es instantáneo y no
necesita CI. El arreglo se hace después, por el camino normal.

### Datos perdidos por una migración

Migración compensatoria si se puede; restaurar desde backup si no. Los dos caminos están en
[`deployment.md`](./deployment.md#6-volver-atrás). Restaurar pierde lo que entró después del punto de
restauración, y en este proyecto eso significa aportes conciliados: hay que rehacer la conciliación
desde el resumen del banco.

---

## 10. Rutinas

| Cada | Qué | Quién |
|---|---|---|
| Semana | Conciliación (sección 6) | `owner` |
| Semana | Una novedad, aunque sea corta. El silencio se lee como que algo salió mal | `editor` |
| Mes | Revisar quién tiene qué rol (sección 5) | `owner` |
| Mes | Revisar los pull requests de Dependabot que quedaron abiertos | Quien mantiene |
| Antes de cada despliegue que toque `/admin`, la autenticación, Storage o las policies | Lo que la suite no puede afirmar (sección 7) | Quien despliega |
| Antes de cada despliegue | `npm run verify` en verde | CI, y conviene también en local |
| Cuando cambia una página, y sin excepción cuando lleguen las fotos | El loop de revisión visual: `node scripts/screenshots.mjs` y mirar las once páginas en los dos anchos. Los seis criterios medibles ya los sostiene CI; lo que hay que mirar son los cuatro que son un juicio (`docs/testing.md`) | Quien la cambió |

## Documentos relacionados

| Documento | Qué agrega |
|---|---|
| [`deployment.md`](./deployment.md) | Workflows, secretos, migraciones a producción, rollback |
| [`security.md`](./security.md) | Las cuatro fronteras, RLS, la matriz de permisos completa |
| [`testing.md`](./testing.md) | Los niveles de prueba, los dos modos, pgTAP |
| [`privacy.md`](./privacy.md) | Qué datos hay y cuánto se conservan |
| [`content-guide.md`](./content-guide.md) | Cómo se escribe una novedad |
