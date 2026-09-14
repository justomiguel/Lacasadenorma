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

**2. El retrato es rectangular, privado, y no se publica.** No es un avatar
redondo de aplicación (ADR-032, el retrato de Justo en contacto). Vive en el
bucket privado `avatares`, en `{user_id}/retrato.{jpg|png|webp}`. Lo lee su dueña
por `/cuenta/retrato`, que pide una URL firmada en el servidor, la usa y la
descarta —el mismo patrón que los comprobantes—. El muro, el catálogo y cualquier
respuesta pública **no** lo nombran. Subirlo no es consentimiento para aparecer.

**3. Cerrar sesión, cambiar la contraseña y la foto viven donde ya vive la
cuenta.** El menú muestra nombre, retrato, enlace a `/cuenta` y «Cerrar sesión».
Agregar o cambiar la foto, cambiar la contraseña y borrar la cuenta siguen en
`/cuenta`. No se inventa un panel de ajustes aparte. Esa página se lee como un
índice editorial (`SectionTabs`): reservas, cómo aparecer, acceso y borrar.

**4. El backoffice se nombra en el chrome público sólo si hay rol.** El snapshot
de `/cuenta/sesion` incluye `staff`. Quien dona no lo ve; quien carga el catálogo
o las novedades ve «Backoffice» en el encabezado de escritorio y en el menú del
teléfono, y un enlace en `/cuenta` que no espera a hidratar. En el menú, la cuenta
—y Backoffice— van **arriba** de las cinco secciones: en 360×640 esas secciones
llenan la pantalla y un enlace debajo no se ve. En el encabezado de escritorio no
se suma «Cerrar sesión»: un tercer enlace recorta la acción de ayudar. El pie no
lo muestra. En `/admin` el chrome público sigue sin personalizarse. La prosa
editorial del sitio **no** se edita desde ahí: sigue en `content/*.json`
(ADR-007).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Leer la sesión en `PublicDocument` | Personaliza cada página pública, rompe el caché y pone un dato de cuenta en el HTML que SC-204 promete idéntico para todo el mundo |
| Bucket público `avatares` | Esconder la fila no escondería el archivo. Un UUID en la ruta no es un secreto |
| Avatar circular en el encabezado de 60 px | Es exactamente el chrome de SaaS que ADR-032 sacó del encabezado. El retrato es chico y rectangular, y en teléfono vive en el menú |
| Foto en el muro | Aparecer con foto es otra decisión, distinta de aparecer con nombre, y nadie la pidió. El default sigue siendo no aparecer |
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
  también está en `/admin`. El chrome de cuenta **no** se personaliza ahí: el
  panel ya tiene su propia salida, y la pública manda a `/cuenta/ingresar`.
- «Backoffice» en el encabezado público aparece después de hidratar, igual que
  el nombre. En el menú del teléfono va arriba de las secciones, porque debajo
  de las cinco de display no entra en 360×640. En `/cuenta`, que ya es dinámica,
  el enlace del equipo está en el HTML. Una cuenta creada en `/cuenta/crear` no
  lo ve: no tiene rol.
- `FR-238` se amplía: el mínimo ahora admite una foto optativa, que no se publica.
  La política de privacidad se actualiza en el mismo cambio.
