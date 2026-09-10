# Despliegue

Cómo llega un cambio desde una rama hasta el sitio publicado, qué hay que tener configurado para
que eso funcione, y cómo se vuelve atrás cuando sale mal.

El principio que ordena todo el resto: **GitHub es la fuente de verdad**. El despliegue no lo
dispara el hook de Git de Vercel sino GitHub Actions, para que nada llegue a producción sin haber
pasado por las mismas compuertas, y para que quede registrado qué commit se desplegó y quién aprobó
lo que había que aprobar.

---

## 1. El flujo, de principio a fin

```
rama de feature → pull request → CI + E2E + Calidad + (Base de datos) → preview → review
                → merge a main → CI + E2E → migraciones (simulacro → aprobación → aplicar)
                → producción → health check
```

1. **Rama.** Se trabaja siempre en una rama; `main` está protegida y no acepta push directo.
2. **Pull request.** Al abrirlo corren `ci.yml`, `e2e.yml` y `quality.yml`, y además `db.yml` si el
   cambio toca `supabase/` o `scripts/db-local.sh`. En paralelo se publica un **preview** en Vercel.
3. **Review.** Se revisa el código y se mira el preview, en 360 px y en 1440 px. La plantilla de
   pull request lista lo que tiene que ser verdad antes de aprobar.
4. **Merge.** Con todo en verde y aprobado. El merge a `main` vuelve a disparar `ci.yml` y `e2e.yml`
   sobre el commit final.
5. **Producción.** `deploy.yml` espera a que esos dos terminen **en verde para ese mismo commit**;
   recién entonces mira si hay migraciones pendientes y despliega.

Ese "espera a que terminen" es el motivo de que `deploy.yml` se dispare con `workflow_run` y no con
`push`: con `push` arrancaría al mismo tiempo que las compuertas, es decir sin compuertas.

---

## 2. Los workflows, uno por uno

| Workflow      | Qué protege                                                                            | Cuándo corre                                                     |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `ci.yml`      | Tipos, reglas de capas, formato, tests, cifras de relleno, build, secretos en el bundle | Cada pull request y cada push a `main`                           |
| `db.yml`      | Que las migraciones apliquen y que las policies RLS nieguen lo que tienen que negar     | Pull requests que tocan `supabase/**` o el script; push a `main` |
| `e2e.yml`     | Los nueve flujos críticos y la accesibilidad, en dos modos y tres navegadores            | Cada pull request y cada push a `main`                           |
| `quality.yml` | Los presupuestos de performance, accesibilidad, buenas prácticas y SEO                  | Cada pull request y cada push a `main`                           |
| `deploy.yml`  | Que a producción llegue sólo lo que pasó las compuertas                                 | Pull request (preview) y `workflow_run` de CI/E2E sobre `main`   |

Dos cosas que parecen detalles y no lo son:

- **`check:secrets` corre después del `build`.** El script mira los archivos de `.next/static`, o sea
  el JavaScript que se le sirve al navegador. Sin build previo avisa que omite esa revisión y sale en
  verde: la comprobación más importante quedaría desactivada sin que nadie se entere.
- **`db.yml` está separado de `ci.yml`.** Instalar PostgreSQL 17 con pgTAP tarda minutos y sólo puede
  cambiar de resultado si cambia el esquema. Junto con el resto haría esperar ese tiempo a cada
  corrección de una coma.
- **`e2e.yml` es una matriz de dos modos**, así que aparecen **dos** checks: `sin-datos · flujos
  críticos y accesibilidad` y `con-datos · flujos críticos y accesibilidad`. Sin `fail-fast`: si los
  dos se rompen hace falta ver los dos, y cancelar el segundo esconde la mitad del diagnóstico.

Ni Lighthouse ni el modo `sin-datos` usan credenciales de Supabase, y es a propósito: el sitio tiene
que funcionar sin base de datos configurada (FR-034), y correr la suite en ese modo es la única
verificación automática de que la degradación funciona. Si algo falla ahí, se arregla la página o el
test; **no** se agregan secretos a esos workflows.

El modo `con-datos` tampoco usa el proyecto de Supabase: levanta un PostgreSQL local con el fixture y
un PostgREST encima. Las cifras que la suite verifica son las del fixture, conocidas y estables, no
las de producción. Un E2E que dependiera de los datos reales fallaría cada vez que alguien registra
un aporte.

---

## 3. Secretos del repositorio

Se cargan en **Settings → Secrets and variables → Actions → Repository secrets**. Ninguno se
imprime: los workflows los pasan por `env:` a un comando que los lee del entorno, nunca dentro de un
`echo` ni de una URL.

| Secreto                 | De dónde sale                                                                                                       | Quién lo usa                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `VERCEL_TOKEN`          | Vercel → Account Settings → Tokens → Create. Alcance: sólo el equipo o la cuenta del proyecto                        | `deploy.yml`, preview y producción              |
| `VERCEL_ORG_ID`         | `.vercel/project.json` después de correr `vercel link`, campo `orgId`; o Vercel → Team Settings → General            | `deploy.yml`                                    |
| `VERCEL_PROJECT_ID`     | El mismo `.vercel/project.json`, campo `projectId`; o Project Settings → General                                     | `deploy.yml`                                    |
| `SUPABASE_ACCESS_TOKEN` | Supabase → Account → Access Tokens → Generate new token. Es un token personal: conviene que sea de una cuenta de servicio, no de una persona | `deploy.yml`, jobs de migraciones               |
| `SUPABASE_PROJECT_REF`  | La referencia del proyecto: el `<ref>` de `https://<ref>.supabase.co`, también en Project Settings → General          | `deploy.yml`, `supabase link`                   |
| `SUPABASE_DB_PASSWORD`  | La contraseña de la base que se fijó al crear el proyecto (Project Settings → Database → Database password)           | `deploy.yml`, `supabase db push`                |

`.env.example` documenta estas mismas variables al final, para que la lista viva en un solo lugar
conceptual aunque se cargue en dos.

Las variables de la aplicación (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) **no** son secretos de GitHub: se
cargan en Vercel, por entorno (Production / Preview / Development). El build de producción lo hace
`vercel build --prod`, que baja esas variables con `vercel pull`; GitHub Actions nunca las ve.

### Rotación

Orden correcto, y no es intercambiable: **crear la nueva → desplegar con la nueva → revocar la
vieja**. Al revés hay una ventana en la que el despliegue está roto. Para `SUPABASE_SECRET_KEY` y
para la clave publicable, el cambio se hace en Vercel y requiere un redeploy para que tome efecto.

---

## 4. Preview y producción: en qué se diferencian

|                     | Preview                                            | Producción                                             |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| Disparador          | Abrir o actualizar un pull request                 | `CI` y `E2E` en verde sobre un commit de `main`        |
| Variables           | Entorno *Preview* de Vercel                        | Entorno *Production* de Vercel                         |
| URL                 | La que devuelve el despliegue, en el resumen del job | El dominio del proyecto                               |
| Base de datos       | La que esté configurada en el entorno Preview      | El proyecto Supabase de producción                     |
| Migraciones         | No aplica ninguna                                  | Simulacro, aprobación humana y recién ahí se aplican   |
| Pull request de fork | No hay preview                                     | —                                                      |

Lo último es deliberado: dar previews a forks requeriría `pull_request_target`, que corre el
workflow del repositorio base **con los secretos disponibles** sobre código que escribió otra
persona. Es la forma conocida de perder el token de despliegue. Un aporte externo se revisa
localmente.

Mientras los secretos de Vercel no estén cargados, el job de preview no falla: escribe en el resumen
qué falta y termina en verde. La alternativa era un pull request en rojo por algo que ningún autor
puede arreglar desde el código, y una compuerta que está roja por defecto es una compuerta que se
aprende a ignorar. El de producción sí falla en el mismo caso, y a propósito: un merge a `main` que
no publica nada y no se queja deja creer que el sitio está al día cuando no lo está.

---

## 5. Cómo llegan las migraciones a producción

Es la única operación de todo el repositorio que no se puede deshacer con un revert. Un `drop
column` aplicado ya se llevó los datos. Por eso el camino tiene tres tramos:

1. **`migraciones-plan`** corre `supabase db push --linked --dry-run` y publica en el resumen del job
   el SQL exacto que se ejecutaría. No toca nada. Si el CLI contesta que la base remota está al día,
   marca que no hay pendientes y el resto se saltea. Ante cualquier otra salida asume que sí hay:
   pedir una aprobación de más es barato, aplicar sin que nadie mire no.
2. **`migraciones-aplicar`** declara `environment: production`, y ese entorno tiene revisores
   obligatorios. El job queda **detenido** hasta que una persona abra el resumen del paso anterior,
   lea el SQL y apruebe. Después corre `supabase db push --linked` y, enseguida, los advisors de
   seguridad contra el proyecto real — que es la verificación que el shim local no puede dar
   (ADR-013).
3. **`desplegar-produccion`** va después, no antes: si el código nuevo consulta una columna que
   todavía no existe, el orden inverso publica un sitio roto. Cuando no había migraciones pendientes,
   el paso anterior queda en `skipped` y el despliegue sigue igual, sin aprobación de por medio.

El despliegue del sitio **no** pide aprobación manual, a propósito. La aprobación existe para lo
irreversible; pedirla también para publicar HTML la convertiría en un trámite, y un trámite se
aprueba sin leer.

### Antes del primer push a producción

Vale la pena hacerlo a mano y con tiempo, no dentro de un pull request apurado:

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push --dry-run          # leer el SQL entero
npx supabase db push
npx supabase db advisors --linked --type all --level warn
```

El shim local es parcial: no tiene GoTrue, PostgREST ni Realtime, así que una migración puede pasar
en `db.yml` y comportarse distinto en el proyecto real. Ese primer `db advisors --linked` es la
compuerta verdadera.

---

## 6. Volver atrás

**El sitio.** Vercel → Deployments → el despliegue anterior que estaba bien → *Promote to
Production*. Es instantáneo y no necesita CI. Después, el arreglo se hace igual que cualquier
cambio: rama, pull request, compuertas. Un `git revert` del commit problemático y su merge a `main`
llega al mismo lugar por el camino normal, pero tarda lo que tarda CI; si el sitio está roto, primero
se promueve y después se revierte con calma.

**Una migración.** No hay botón. Las opciones, en orden de preferencia:

1. **Migración compensatoria.** Se escribe una migración nueva que deshace el cambio, se prueba con
   `npm run db:verify`, y pasa por el mismo camino de aprobación. Es lo correcto siempre que el
   cambio no haya destruido datos.
2. **Restaurar desde backup.** Supabase mantiene backups automáticos (Project Settings → Database →
   Backups). Restaurar significa perder lo que entró después del punto de restauración, así que es
   la opción para cuando se perdieron datos y no hay otra.

De ahí que las migraciones destructivas requieran plan de rollback escrito antes de aplicarse, no
después.

**Un secreto comprometido.** Revocar primero en el proveedor (Vercel o Supabase), crear el
reemplazo, actualizarlo en GitHub o en Vercel según corresponda, y redeployar. Un token revocado
rompe el despliegue, que es un problema mucho más chico que un token vivo en manos ajenas.

---

## 7. Lo que hay que configurar a mano en GitHub

Nada de esto se puede dejar escrito en un archivo del repositorio; son ajustes de la interfaz de
GitHub. Hasta que estén, los workflows corren pero **las compuertas no bloquean nada**.

1. **`.github/CODEOWNERS`**: completar el handle de GitHub del dueño del repositorio. El archivo trae
   un marcador sin llenar a propósito, con la explicación adentro.
2. **Protección de `main`** (Settings → Rules o Branches):
   - requerir pull request antes del merge, con al menos una aprobación;
   - requerir revisión de Code Owners (después de completar el CODEOWNERS);
   - requerir que estén en verde: `Todo lo que rompe el merge`, `Riesgo conocido en las
     dependencias`, `sin-datos · flujos críticos y accesibilidad`, `con-datos · flujos críticos y
     accesibilidad`, `Presupuestos de performance, accesibilidad y SEO` y, cuando el cambio toca el
     esquema, `Migraciones, advisors y policies RLS`;
   - requerir que la rama esté actualizada con `main` antes de mergear;
   - prohibir push directo y force-push sobre `main`.
3. **Entorno `production`** (Settings → Environments → New environment):
   - nombre exacto `production`, que es el que declara `deploy.yml`;
   - **required reviewers**: al menos una persona. Sin esto, la migración se aplica sola y la
     compuerta que este repositorio considera más importante no existe;
   - limitar las ramas de despliegue a `main`.
4. **Secretos** de la tabla de la sección 3.
5. **Secret scanning y push protection** (Settings → Code security): los dos habilitados. Push
   protection es el que impide que una clave llegue al repositorio en primer lugar.
6. **Dependabot**: alertas y security updates habilitados. La configuración de `dependabot.yml`
   cubre las actualizaciones de rutina, no las alertas.
7. **Etiquetas** `bug`, `mejora` y `contenido`, que son las que aplican las plantillas de issue.
8. **Actions → General**: permisos del `GITHUB_TOKEN` en sólo lectura por defecto, y "Allow GitHub
   Actions to create and approve pull requests" desactivado.

---

## 8. Presupuestos de Lighthouse

`lighthouserc.json` en la raíz define qué se mide y contra qué. Es JSON y no admite comentarios, así
que lo que hay que saber está acá:

- **Las nueve páginas públicas**, tres corridas cada una, contra `npm run start` (nunca contra `npm
  run dev`: el servidor de desarrollo no minifica ni comprime, y daría un número que no se parece a
  lo que ve una persona en 4G).
- **Las cuatro categorías ≥ 0,95**, que es lo que fija la constitución (principio VII, SC-003). Es la
  compuerta principal, y la más estable: en las mediciones da entre 0,97 y 0,99.
- **Presupuesto de scripts: 200 KB transferidos por página.** La página más pesada mide 181 KB, de los
  cuales 121 KB son el runtime de React y de Next. El margen alcanza para un cambio de versión y no
  alcanza para importar Zod o un cliente de Supabase en un componente de cliente.
- **Cero recursos de terceros.** No hay analytics invasivo ni fuentes externas: las fuentes se
  autoalojan con `next/font`. Si aparece un tercero, el presupuesto lo hace visible en el pull
  request que lo introduce, que es cuando conviene discutirlo.
- **LCP ≤ 2,8 s y CLS ≤ 0,05.**

Los dos primeros números y el del LCP salen de una medición, no del plan: los que estaban antes se
escribieron antes de que existiera un build y ninguno era alcanzable. Por qué son estos, con las
mediciones, está en [`adr/018-presupuestos-de-performance.md`](./adr/018-presupuestos-de-performance.md).
Ahí también está la razón por la que el LCP no está en 2,5 s: sobre un build sin cambios, la métrica
se mueve 700 ms entre corridas, y un umbral dentro de esa banda se pone rojo por azar.

Se agrega para comparar contra la mediana de las tres corridas, no contra la mejor: una corrida
afortunada no es el sitio.
