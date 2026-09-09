# ADR-015 · Un fixture de desarrollo, separado y explícito

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

El sitio tiene que funcionar sin base de datos, y funciona: sin credenciales muestra el contenido
editorial y omite las cifras con un aviso (FR-034). Pero hay tres cosas que **sólo** se pueden
verificar con datos en la base:

- Que la suma del detalle publicado coincida exactamente con los totales publicados (SC-007). Es el
  criterio del que depende toda la sección de transparencia.
- Que las policies RLS devuelvan lo que corresponde a cada rol. Una policy sobre una tabla vacía
  pasa cualquier prueba.
- Que la barra de progreso, el libro de gastos y la línea de hitos se vean bien con datos reales, y
  no sólo en su estado vacío. El loop de revisión visual sobre estados vacíos no revisa nada.

Al mismo tiempo, la regla más importante del proyecto es que **ninguna cifra ni dato de ejemplo
llegue a la pantalla** (riesgo R4, SC-010). Un CBU de relleno en producción sería el peor fallo
posible del sitio.

Las dos necesidades parecen opuestas. No lo son, si la frontera está en el lugar correcto.

## Decisión

Un único archivo, `supabase/fixtures/dev.sql`, que se aplica **sólo** cuando alguien lo pide
explícitamente con `npm run db:fixture`. Nunca desde `reset`, nunca desde `migrate`, nunca desde el
workflow de despliegue.

Tres propiedades lo hacen seguro:

1. **No es `supabase/seed.sql`.** Ese nombre lo aplica el CLI automáticamente en `db reset`, y en
   algún momento alguien lo correría contra un proyecto real. El nombre y la ruta están elegidos
   para que aplicarlo sea siempre una decisión.
2. **Todo su contenido se anuncia como ficticio en el propio dato.** Los datos bancarios del fixture
   no son un CBU con forma de CBU: son la cadena `CUENTA DE PRUEBA — NO TRANSFERIR`. Si el fixture
   llegara por error a un entorno público, el error sería visible en la primera pantalla, no
   silencioso. Un dato falso disfrazado de verdadero es el fallo; un dato falso que grita que lo es
   sirve de alarma.
3. **La base lo rechaza igual.** La restricción `payment_methods_no_placeholder` prohíbe marcadores
   de relleno en los campos de una cuenta, así que el fixture ni siquiera puede publicar un método
   de aporte que aparente ser real.

Los tests pgTAP **no** usan este fixture: cada archivo crea sus propias filas dentro de la
transacción que `pg_prove` revierte. Un test que depende de un fixture compartido falla por motivos
que no son el test.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| No tener datos de desarrollo | Deja SC-007 sin verificar y el loop visual sin nada que mirar. Es la decisión que produce una página de transparencia que se vio bien vacía y se rompe con datos |
| `supabase/seed.sql` | El CLI lo aplica solo. Es exactamente el mecanismo por el que un dato de prueba termina en producción |
| Generar datos en el test E2E por la API | Requiere el backoffice andando y credenciales de escritura en CI. Más piezas para verificar menos |
| Datos con forma realista | Un CBU con dígito verificador válido en un fixture es una bomba de tiempo. La forma realista no aporta nada al test y quita la única señal de alarma |

## Consecuencias

**Buenas.** SC-007 se verifica de punta a punta. El loop de revisión visual puede mirar la página de
transparencia con veinte gastos y ver si la tabla aguanta. Las cifras de la home se pueden revisar en
360 px con números largos, que es donde se rompen los layouts.

**Malas y aceptadas.**

- Hay un archivo con datos inventados en el repositorio. Se mitiga con el nombre, con el contenido
  que se declara falso, y con `scripts/check-no-placeholders.mjs`, que revisa `content/` y la
  interfaz —no el fixture, que por definición los contiene.
- Alguien podría correr `npm run db:fixture` apuntando `LOCAL_DATABASE_URL` a un proyecto real. La
  mitigación es que el daño sería inmediatamente visible y reversible: son filas nuevas, no un
  `drop`. El runbook lo dice de esa manera.
