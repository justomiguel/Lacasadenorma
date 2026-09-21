# ADR-037 · El chrome de cuenta no personaliza las páginas públicas

**Estado**: Aceptada · **Fecha**: 2026-09-14

## Contexto

Quien entra al sitio y abre el menú sigue viendo «Ingresar», aunque ya tenga sesión.
Cerrar la sesión sólo existe en `/cuenta`. Tampoco hay forma de poner una foto
propia: el perfil guarda correo, nombre público, idioma y anonimato, y nada más.

Hay un choque con una decisión anterior. `docs/privacy.md` y el HTML público
prometen que **las páginas públicas no leen cookies**: el HTML es idéntico para
todo el mundo y se cachea. Meter `readViewer()` en `PublicDocument` haría que cada
visita a la home dependiera de la sesión, rompería ese caché y publicaría —en el
HTML servido— que hay alguien ingresado. SC-204 exige que ninguna página pública
contenga el correo ni el identificador de una cuenta.

La foto, si existiera en un bucket público, sería alcanzable por cualquiera que
adivinara la ruta. Un retrato no es una foto de la obra.

## Decisión

**1. El chrome de cuenta es un island de cliente.** El HTML cacheado sigue
mostrando «Ingresar». Después de hidratar, un `fetch` a `/cuenta/sesion` —ruta que
ya está en el `matcher` de `proxy.ts`, así que renueva el token— devuelve un
snapshot privado: si hay sesión, el nombre elegido (o «Tu cuenta» si no hay
nombre), si hay retrato, el correo, y si hay rol interno (`staff`). El correo
**no** viaja en el HTML público; aparece en el DOM después, en el menú de quien
ya está ingresada. Sin JavaScript,
«Ingresar» sigue yendo a `/cuenta`, que con sesión es la cuenta y sin sesión
redirige al acceso.

**2. El retrato vive en un bucket privado. El catálogo sí publica la cara; el muro no.**
Vive en el bucket `avatares`, en `{user_id}/retrato.{jpg|png|webp}`. Lo lee su
dueña por `/cuenta/retrato`, que pide una URL firmada en el servidor, la usa y
la descarta —el mismo patrón que los comprobantes—. ~~El catálogo no lo nombra.~~
El catálogo la sirve por `/catalogo/retrato/[id]` (el id de la reserva, que ya
es público). El muro y cualquier otra respuesta pública **no** la nombran.
Subirlo no es consentimiento para aparecer: el consentimiento es «aparecer». En
el encabezado público sigue siendo rectangular y chico (ADR-032). En el
menú de trabajo —`/cuenta` y `/admin`— es circular, de 128 px
(`--spacing-avatar`): es quién opera, no el chrome del relato. Sin foto
propia, una silueta genérica: no se inventa una cara.

**3. Cerrar sesión, cambiar la contraseña y la foto viven donde ya vive la
cuenta.** El menú muestra nombre, retrato, enlace a `/cuenta` y «Cerrar sesión».
Agregar o cambiar la foto, cambiar la contraseña y borrar la cuenta siguen en
`/cuenta`. No se inventa un panel de ajustes aparte. Esa página usa el mismo
menú fijo al costado que el backoffice: mis donaciones y la cuenta son enlaces.
Cómo aparecer, la foto, el acceso y borrar son bloques de una página;
`?seccion=` distingue Mis donaciones de Tu cuenta, y ancla el bloque.

**4. El backoffice se nombra en el chrome público sólo si hay rol.** El snapshot
de `/cuenta/sesion` incluye `staff` y `owner`. Quien dona no lo ve; quien carga el
catálogo o las novedades ve «Backoffice» en el menú del teléfono y en el menú
de trabajo de `/cuenta`, que no espera a hidratar. En el menú, la cuenta —y
Backoffice, y Métricas si es owner— van **arriba** de las cinco secciones: en
360×640 esas secciones llenan la pantalla y un enlace debajo no se ve. El
encabezado de escritorio no suma el nombre, ni «Backoffice», ni «Métricas»: un
enlace más recorta la acción de ayudar. Con sesión es un botón «Mi Panel»
hacia `/cuenta`. Salir no va en el encabezado: en teléfono recorta el
nombre. El pie no muestra Backoffice.
El índice del panel es un submenú siempre abierto en la columna izquierda,
el mismo en `/cuenta` y en `/admin`: Campaña y Plata agrupan hermanas;
Catálogo, Donaciones y Donantes van cada uno al costado. Las hermanas de
un grupo se cambian con pestañas adentro del contenedor. La
prosa editorial del sitio **no** se edita desde ahí: sigue en
`content/*.json` (ADR-007).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Leer la sesión en `PublicDocument` | Personaliza cada página pública, rompe el caché y pone un dato de cuenta en el HTML que SC-204 promete idéntico para todo el mundo |
| Bucket público `avatares` | Esconder la fila no escondería el archivo. Un UUID en la ruta no es un secreto |
| Avatar circular en el encabezado de 60 px | Es exactamente el chrome de SaaS que ADR-032 sacó del encabezado. El retrato es chico y rectangular, y en teléfono vive en el menú |
| Foto en el muro | El catálogo sí publica la cara cuando la persona eligió aparecer. El muro no. Un segundo permiso «mostrar foto» nadie lo pidió. El default sigue siendo no aparecer |
| Crear el perfil al pedir `/cuenta/sesion` | Abrir el menú dispararía el correo de «pedido de cuenta» sin que la persona hubiera entrado a `/cuenta` |

## Consecuencias

**Buenas.** Quien entra ve su nombre, su foto y cómo irse, sin que el resto del
sitio deje de ser cacheable. La foto es un dato personal con la misma frontera
que el perfil: propiedad, no rol. Borrar la cuenta borra el archivo.

**Malas y aceptadas.**

- Quien está ingresada ve un instante de «Ingresar» en las páginas públicas,
  hasta que hidrata el island. Es el precio de no personalizar el HTML. En
  `/cuenta`, que ya es dinámica, el parpadeo no importa.
- Subir el retrato no se puede afirmar de punta a punta en el entorno local: el
  shim de Storage no firma URLs (ADR-013). La compuerta local es pgTAP sobre las
  policies y el caso de uso con un puerto falso. La subida real queda en el
  runbook, al lado de las fotos de las novedades.
- El backoffice vive debajo de `PublicDocument`, así que el encabezado público
  también está en `/admin`. El atajo del encabezado es «Mi Panel» hacia
  `/cuenta`. El menú de trabajo muestra Backoffice como submenú, no como un
  chrome aparte.
- «Mi Panel» en el encabezado público aparece después de hidratar. En el menú
  del teléfono, Backoffice va arriba de las secciones, porque debajo de las
  cinco de display no entra en 360×640. En `/cuenta`, que ya es dinámica, el
  enlace del equipo está en el HTML. Una cuenta creada en `/cuenta/crear` no
  lo ve: no tiene rol.
- `FR-238` se amplía: el mínimo ahora admite una foto optativa, que no se publica.
  La política de privacidad se actualiza en el mismo cambio.

## Enmienda · Métricas en el drawer (2026-09-16)

El snapshot de `/cuenta/sesion` también incluye `owner` (un boolean, no el nombre del rol). En el
menú del teléfono, debajo de Backoffice, quien es owner ve **Métricas** hacia `/admin/metricas`
(FR-615). El encabezado de escritorio no lo suma: un enlace más recorta Ayudar. Un editor ve
Backoffice en el menú y no ve Métricas: el enlace no puede prometer una pantalla que después dice
sin permiso.

El bloque de cuenta de ese menú lleva un icono de trazo de `icons.tsx` en cada salida (cuenta,
backoffice, métricas, cerrar sesión), para barrer una lista chica. Las cinco secciones de display
siguen sin pictograma: son capítulos, no un menú de aplicación (ADR-032).

## Enmienda · Mi Panel en el encabezado (2026-09-20)

Con sesión, el encabezado de escritorio deja de mostrar el nombre. El control es un
botón «Mi Panel» —la misma caja de Ingresar, con el pictograma de persona— hacia
`/cuenta`. Salir no entra al encabezado: en un teléfono el nombre, el icono
rojo y el menú no caben. Backoffice y Métricas siguen en el menú del
teléfono y en el menú de trabajo. En ese menú, Cerrar sesión ocupa el pie
donde iba el lema, con fondo rojo. En el teléfono el menú de trabajo no se
pinta: mis donaciones, la cuenta, Backoffice y Métricas salen del
hamburguesa.

## Enmienda · Cara en el catálogo (2026-09-20)

Se tacha «el catálogo no lo nombra». El catálogo sí publica la cara, por el id
de la reserva. El muro no. El bucket `avatares` sigue privado. La alternativa
«Foto en el muro» sigue descartada.
