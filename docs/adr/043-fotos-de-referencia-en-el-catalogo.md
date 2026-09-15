# ADR-043 · Fotos de referencia en el catálogo

**Estado**: Aceptada · **Fecha**: 2026-09-15

Enmienda a [ADR-021](./021-segunda-direccion-visual.md) y a
[FR-212](../../specs/002-cuentas-y-catalogo-de-donaciones/spec.md): el catálogo
puede mostrar una foto de referencia del tipo de material. Las páginas
editoriales —Norma, el incendio, la obra— no.

## Contexto

ADR-021 cerró el sitio a tres cosas: stock, ilustración de relleno e imagen
generada. Lo que entra es lo que la familia sacó. En historia, incendio y
reconstrucción eso sigue siendo cierto: una foto de stock de una casa quemada
afirmaría sobre el mundo algo que no pasó.

El catálogo es otra clase de foto. Cada ficha pide un material o un objeto
que **todavía no está** en esta casa. No hay una foto de *estos* ladrillos ni
de *esta* heladera: se quemaron, o no se compraron. Reservar el hueco en
ochenta fichas deja `/catalogo` como un listado de rectángulos vacíos, y no
ayuda a quien quiere traer el objeto a reconocerlo.

El pedido es cambiar la regla **sólo para el catálogo**: cada ítem puede
llevar una foto bajada o generada, etiquetada como referencia del tipo, nunca
como foto de una compra de esta casa.

## Decisión

**En el catálogo, una foto de referencia del tipo está permitida. En el
relato, no.**

1. **Dos fotos, un orden.** Si el equipo subió una foto real desde
   `/admin/catalogo` (`photo_media_id` → Storage), esa gana: es la de esa
   compra o de ese material en la obra. Si no hay, la ficha muestra la foto
   de referencia del título, declarada en `content/{es,en}/catalogo-fotos.json`
   con el archivo en `public/fotos/catalogo/`. Si no hay ninguna de las dos,
   se reserva el hueco y se dice qué va ahí (FR-212).
2. **El epígrafe es la frontera de honestidad.** Toda foto de referencia MUST
   llevar un epígrafe que diga que es solamente ilustrativa y que no representa
   el objeto real, y un crédito de la fuente. El `alt` describe lo que se ve,
   como ilustración del tipo. No se presenta como foto de *esta* casa ni del
   objeto que se va a comprar. La foto subida desde el backoffice usa el
   epígrafe que cargó el equipo.
3. **Viven en el repositorio, no en Storage.** Se eligen una vez, como el
   resto del contenido de baja frecuencia (ADR-007). Storage sigue siendo el
   camino de las fotos operativas: avance de la obra y la foto real de un
   ítem cuando alguien la sube.
4. **El listado muestra una miniatura en Qué.** Quien escanea `/catalogo` tiene
   que reconocer el objeto sin abrir cada ficha: es para eso que están las fotos.
   La miniatura (`w-5xl`) va en la misma celda que el título, no en una columna
   nueva —una columna más desborda—. Sin foto no se reserva hueco en la tabla.
   El epígrafe completo y el crédito viven en la ficha; el caption de la tabla
   dice que las fotos son ilustrativas y no representan el objeto real.
5. **Historia, incendio, Norma, obra, novedades: sin cambio.** Stock, IA e
   ilustración de relleno siguen prohibidos ahí. Una foto de una casa
   quemada que no es ésta, o un retrato generado de Norma, sigue siendo una
   mentira.

La constitución VIII sigue prohibiendo las ilustraciones artificiales como
firma visual. Una foto de referencia **etiquetada** de un ladrillo no es
eso; un blob decorativo o una ilustración para «llenar» `/que-paso` sí.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir reservando el hueco hasta tener la foto de *esta* compra | El objeto todavía no existe. El hueco en cada ficha no ayuda a reconocerlo |
| Poner stock también en el relato | Afirma sobre Norma, el incendio o la obra algo que no se fotografió. Es exactamente lo que ADR-021 cerró |
| Subir las de referencia a Storage por SQL | El Storage local no sirve ese camino, y estas fotos no cambian con cada donación: son contenido, no dato operativo |
| Publicarlas sin epígrafe | Se leen como fotos de esta casa. El dato inventado no es el ladrillo: es la atribución |
| Ilustración o icono de relleno | Lo prohíbe la constitución VIII y `check:marcas` no cubre esto: un icono de heladera en una campaña que pide plata se lee como plantilla |

## Consecuencias

**Buenas.** El listado y cada ficha del catálogo básico muestran qué se
está pidiendo. Quien trae el objeto lo reconoce sin abrir ochenta fichas.
El relato de la familia sigue sin stock. La foto real, cuando alguien la
suba, pisa la de referencia sin migrar nada.

**Malas y aceptadas.**

- En el repositorio hay fotos que no sacó la familia. Hoy son **imágenes de
  referencia generadas**, con epígrafe y crédito que lo dicen. Se mitiga con
  la carpeta aparte (`public/fotos/catalogo/`) y con `npm run check:fotos`,
  que exige cada título del SQL de la casa básica —y el del fixture— con esa
  etiqueta, y rechaza una foto de catálogo declarada como editorial. Si el
  equipo sube la foto real, esa pisa la generada.
- Una foto de referencia puede no coincidir en marca, medida o color con lo
  que la obra termina comprando. El epígrafe lo dice. El estimado de
  ADR-041 ya avisó lo mismo sobre el precio.
- Un ítem creado a mano con un título que no está en el JSON sigue sin foto:
  el hueco es el estado correcto, no un fallo de la excepción.

**Compuerta.** `scripts/check-fotos.mjs` recorre también `public/fotos/catalogo/`,
exige el epígrafe de referencia en castellano y en inglés, y exige un
archivo por cada título de `docs/sql/catalogo-casa-basica.sql`. Sin eso,
esta decisión es un párrafo.
