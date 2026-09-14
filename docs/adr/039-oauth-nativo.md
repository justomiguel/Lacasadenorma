# ADR-039 · Alta con las redes sociales nativas de Supabase Auth

**Estado**: Aceptada · **Fecha**: 2026-09-14

## Contexto

El registro del público (ADR-027) pide correo y contraseña, y la confirmación del
correo. Para quien llega con Gmail —o con Apple, o con la red que ya usa— eso es
un paso de más: ya demostró esa dirección en otro lado, y acá se le pide que
invente una contraseña y que abra un enlace.

La spec de la feature 002 lo dejó fuera a propósito: un proveedor externo agrega
un tercero al que hay que confiarle identidad y un logo más en la interfaz. Eso
sigue siendo cierto. Lo que cambió es el pedido: **crear la cuenta con Gmail y
con cualquier otra red social que Supabase Auth hable de forma nativa**.

Supabase Auth ya habla OAuth. No hay SDK nuevo, no hay cola, no hay un segundo
proveedor de identidad. Lo que hay que decidir es qué se muestra, qué se copia
del perfil ajeno, y a dónde vuelve el navegador cuando Google termina.

## Decisión

**1. Catálogo cerrado de redes sociales nativas, no de todo lo que Auth habla.**
Google, Apple, Facebook, X, GitHub, GitLab, LinkedIn, Discord, Twitch y Spotify.
Azure, Keycloak y WorkOS son IdP de empresa y no entran. Instagram no tiene
login nativo en Auth. Agregar una red es agregarla al catálogo, al logo y a la
lista del entorno, en el mismo commit.

Los ids son los de la marca que se muestra. GoTrue a veces usa otro nombre
(`twitter` por X, `linkedin_oidc` por LinkedIn): el dominio traduce.

**2. El botón existe sólo si está habilitado.** `AUTH_SOCIAL_PROVIDERS` es del
servidor, sin `NEXT_PUBLIC_`, lista separada por comas. Vacía o ausente: ningún
botón. No se inventa Google porque es el más común, no se pone «próximamente»,
no se muestra un control que no hace nada. Habilitar el proveedor en el panel
de Supabase y no ponerlo acá es deliberado: el panel dice que Auth *puede*
hablar con Google; la variable dice que *este sitio se lo ofrece a la persona*.

**3. Se copia el nombre y la foto de la red, como propuesta, no como
publicación.** Quien entra con Google (o con otra red del catálogo) ya dijo
cómo se llama y cómo se ve en esa cuenta. El perfil acá nace con ese nombre y
con ese retrato, para no pedírselos de nuevo. Sigue anónimo y `pending`: el
muro no los publica hasta que la persona desmarque el anonimato, y el retrato
sigue siendo privado (ADR-037). Si ya había elegido un nombre o una foto acá,
no se pisan. El local-part del correo sigue sin ser un nombre (FR-230).

**4. Sin correo no hay cuenta.** Una reserva se confirma por correo. Si el
proveedor no entrega una dirección, se cierra la sesión que acaba de abrirse y
la pantalla lo dice. Google la entrega; Apple puede no, si la persona oculta el
correo.

**5. El callback es propio y el destino no viene de la query.**
`/cuenta/oauth` canjea el `code` de PKCE, escribe la cookie y manda a `/cuenta`
(o al catálogo, si la acción dejó esa vuelta en una cookie httpOnly). Un `next`
en la URL no se respeta: es la misma lección que `/cuenta/confirmar`. `303`,
`no-store`, destino relativo.

**6. El correo y la contraseña siguen.** OAuth es una alternativa, no un
reemplazo. La acción primaria de crear e ingresar sigue siendo el formulario.
Las redes se ofrecen debajo, separadas por un «o», con el logo al lado del
nombre (regla de marcas). No son píldoras ni una segunda primaria.

**7. Un mismo correo es una sola cuenta.** Auth une las identidades que
comparten un correo confirmado. Quien ya tenía cuenta con contraseña y
después entra con Google (la misma dirección) sigue siendo esa persona: no se
crea una segunda fila. Al revés, quien nació por Google puede poner una
contraseña en `/cuenta` y entrar con las dos. Un correo distinto es otra
cuenta; unirlas a mano (`linkIdentity`) no se ofrece en esta versión.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Mostrar las veinte redes que Auth lista | Azure, Keycloak y WorkOS no son redes sociales para este público. Un botón de Keycloak en `/cuenta/crear` es un control que nadie va a usar y que hay que vestir con un logo |
| `NEXT_PUBLIC_AUTH_SOCIAL_PROVIDERS` | No es un secreto, pero un módulo de cliente no tiene por qué conocer la lista. La página es un Server Component y baja los ids por props; `check:secrets` ya rechaza leer entorno de servidor desde `"use client"` |
| Copiar el nombre al muro sin preguntar | El default sigue siendo el anonimato. Traer el nombre de Google llena el campo; publicarlo es otra decisión |
| Pedir nombre y foto de nuevo después de Google | Es el paso que este pedido elimina. La persona puede cambiarlos en `/cuenta` |
| Saltear `pending` porque el correo ya está verificado | ADR-033 no es sobre la veracidad del correo: es sobre que el equipo vea a quién le abre el catálogo. OAuth demuestra el correo; no decide la habilitación |
| Unir cuentas con correos distintos | `linkIdentity` pide una sesión ya abierta y un segundo salto. El caso que importa es el mismo Gmail con el que ya se registró |
| Magic link como único método, sin OAuth | Ya estaba descartado en ADR-003 para el backoffice. Para el público, el correo con contraseña ya existe; OAuth es el atajo, no el reemplazo |
| Probar el hop real contra Google en Playwright | El harness local emula GoTrue, no a Google. El salto verdadero se documenta en el runbook, igual que el retrato (ADR-013). Lo que el e2e afirma es: el botón aparece cuando está habilitado, el callback canjea, la sesión queda abierta, el perfil nace `pending` con el nombre de la red, y un correo que ya tenía cuenta se unifica |

## Consecuencias

**Buenas.** Quien llega con Gmail crea la cuenta en un salto. El código sirve
para cualquier otra red del catálogo sin reescritura: habilitarla es la
variable, el logo y la credencial en el panel. Nada de esto toca RLS: una
cuenta de Google es `authenticated` sin rol, igual que una de correo.

**Malas y aceptadas.**

- Hay un tercero en el camino de identidad. Google (o Apple, o quien sea) se
  entera de que esa persona usa este sitio. Está escrito en la política de
  privacidad, no disimulado.
- El harness no habla OAuth de verdad. `scripts/local-api` emula `/authorize` y
  el canje PKCE, y emite un usuario con el correo ya confirmado. El hop contra
  el proveedor real se prueba a mano, una vez, cuando se habilita en
  producción, y el procedimiento está en `docs/runbook.md`.
- Una cuenta que nació por OAuth no tiene contraseña hasta que la persona pone
  una en `/cuenta`. Entrar de nuevo es por la misma red, o por la contraseña si
  la fijó.
- `additional_redirect_urls` del proyecto tiene que incluir `/cuenta/oauth` y
  `/en/cuenta/oauth`, con las URLs de preview de Vercel, o el callback rebota
  a la home sin explicación. Es la misma trampa que los enlaces del correo
  (`research.md` §3).
