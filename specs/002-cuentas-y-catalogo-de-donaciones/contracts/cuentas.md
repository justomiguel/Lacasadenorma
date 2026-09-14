# Contrato — Identidad del público

Qué rutas existen, qué hace cada Server Action, y dónde está la frontera de seguridad.

La regla que gobierna todo este contrato: **`proxy.ts` no autoriza nada** (ADR-003). Refresca la
sesión y redirige de forma optimista. Cada página y cada acción revalida por su cuenta, y con el
registro abierto eso deja de ser una precaución teórica: ahora hay sesiones válidas de gente que no
tiene por qué poder nada.

## Rutas

Castellano sin prefijo, inglés bajo `/en`, slugs sin traducir (ADR-023).

| Ruta | Tipo | Qué hace |
|---|---|---|
| `/cuenta/crear` | Página + formulario de cliente | Registro con correo y contraseña, y con las redes habilitadas (ADR-039) |
| `/cuenta/ingresar` | Página + formulario de cliente | Inicio de sesión, igual |
| `/cuenta/oauth` | **Route handler** | Canjea el `code` de PKCE y crea la sesión. Destino cerrado: sin `next` de query |
| `/cuenta/recuperar` | Página + formulario de cliente | Pide el correo de recuperación |
| `/cuenta/clave` | Página + formulario de cliente | Fija contraseña nueva, con sesión de recuperación |
| `/cuenta/confirmar` | **Route handler** | Consume el enlace del correo y crea la sesión |
| `/cuenta` | Server Component | Índice editorial de la cuenta: reservas, cómo aparecer (foto y nombre), acceso y borrar. `?seccion=` recuerda la pestaña abierta. |
| `/cuenta/sesion` | **Route handler** | Snapshot privado del chrome: anónima o nombre/correo/si hay retrato/`staff`. **No** crea el perfil |
| `/cuenta/retrato` | **Route handler** | Sirve el retrato propio. Pide la URL firmada en el servidor y la descarta (ADR-037) |

`/cuenta/confirmar` es un `route.ts` y no una página porque su trabajo es canjear un token y
redirigir; no tiene nada que mostrar. Llama a `verifyOtp({ type, token_hash })` con lo que viene en la
query, y **valida el destino** contra la lista de rutas conocidas antes de redirigir: un `next` que se
respeta sin validar es un redirect abierto.

`/cuenta/oauth` es el mismo patrón para el salto a una red (ADR-039). Canjea el `code` de PKCE con
`exchangeCodeForSession`, y el destino **no viene de la query**: va a `/cuenta`, o al catálogo si la
acción dejó esa vuelta en una cookie httpOnly. Sin correo en la sesión que acaba de abrir, cierra y
manda a ingresar con `aviso=oauthNoEmail`. El `redirectTo` de `signInWithOAuth` y el de los correos
tienen que estar los dos en `additional_redirect_urls`.

`/cuenta` no es un panel de ajustes aparte (ADR-037): es la misma página de siempre, leída como
índice. Las pestañas son `SectionTabs` —regla debajo, no píldoras—. Si hay reservas, esa pestaña
abre primero; si no, abre «cómo aparecer». Sin JavaScript los cuatro paneles se apilan.

El enlace del correo se arma con `emailRedirectTo` **del idioma en que la persona se registró**, y esa
URL tiene que estar en `auth.site_url` o en `additional_redirect_urls`, incluidas las de preview de
Vercel, o el enlace rebota a la home sin explicar nada (`research.md` §3).

## Server Actions

En `app/(es)/cuenta/actions.ts` y `oauth-actions.ts`. Todas: validan con Zod del lado del servidor,
devuelven un estado discriminado para `useActionState`, y no filtran por qué falló un intento de
sesión.

| Acción | Entrada | Reglas |
|---|---|---|
| `signUp` | correo, contraseña, idioma | Crea la cuenta. **No** inicia sesión: manda a revisar el correo |
| `signIn` | correo, contraseña | Error genérico: no distingue "no existe" de "contraseña incorrecta" |
| `startOAuth` | proveedor, idioma | Redirige al proveedor. Sólo acepta un id del catálogo que esté en `AUTH_SOCIAL_PROVIDERS` |
| `signOut` | — | Cierra sesión y revalida |
| `requestPasswordReset` | correo | **Responde lo mismo exista o no la cuenta** |
| `setPassword` | contraseña | Requiere sesión de recuperación |
| `updateProfile` | nombre público, anonimato, idioma | Revalida el muro si el anonimato cambió |
| `savePortrait` | archivo de imagen | Sube el retrato al bucket privado `avatares` |
| `removePortrait` | — | Borra el retrato |
| `changePassword` | contraseña nueva y confirmación | Requiere sesión activa, no la de recuperación |
| `deleteAccount` | confirmación escrita | Borra la cuenta; las donaciones quedan anónimas (FR-240) |

Dos detalles que son decisiones, no estilo:

- **`requestPasswordReset` contesta igual siempre.** Si contestara "no existe esa cuenta", el
  formulario sería un oráculo para saber quién está registrado en el sitio.
- **`signIn` no dice cuál de los dos campos falló**, por lo mismo.

## Sesión y frontera

| Capa | Qué hace | Es frontera |
|---|---|---|
| `proxy.ts` | Refresca el token en `/admin/*` y en `/cuenta/*`, copia los headers de `setAll` a la respuesta | **No** |
| Página o acción | `getClaims()`, y para el backoffice `requirePermission()` | Sí |
| RLS y privilegios | Policies con rol o propiedad; escrituras por función | **Sí, la que importa** |

`proxy.ts` suma `/cuenta` a su matcher. Sigue valiendo el comentario que ya está en el archivo sobre
copiar los headers de `setAll`: sin eso, un CDN puede cachear un `Set-Cookie` y servirle la sesión de
una persona a otra.

**Una cuenta del público en `/admin`**: pasa el proxy —hay sesión—, y `requirePermission` la manda a
`/admin/sin-permiso`, que explica en lugar de romper. Es el comportamiento que ADR-003 eligió y que
ahora se prueba en Playwright con la persona `donante`, porque pasó de caso teórico a cotidiano.

## Configuración de Auth

En `supabase/config.toml`, con los nombres verificados en `research.md` §3:

```toml
[auth]
enable_signup = true              # deja de ser false

[auth.email]
enable_signup = true
enable_confirmations = true       # NO es opcional: es lo que hace que una sesión implique correo confirmado
max_frequency = "1m"

[auth.email.smtp]                 # ADR-028
host = "smtp.resend.com"
port = 587
user = "resend"
pass = "env(RESEND_API_KEY)"
admin_email = "env(EMAIL_FROM_ADDRESS)"
sender_name = "La Casa de Norma"

[auth.rate_limit]
email_sent = 30                   # el default de 2 por hora agota el cupo con dos registros
sign_in_sign_ups = 30
token_verifications = 30
```

`enable_confirmations = true` es la única línea de este bloque de la que depende una propiedad de
seguridad: sin ella, `claim_donation_item()` tendría que verificar el correo por su cuenta, y el campo
que parece servir para eso vive en `user_metadata` y lo escribe la propia persona.

## Variables de entorno nuevas

| Variable | Dónde | Sin ella |
|---|---|---|
| `RESEND_API_KEY` | Servidor, **sin** `NEXT_PUBLIC_` | No sale ningún correo del producto; se registra `skipped` |
| `EMAIL_FROM_ADDRESS` | Servidor | Ídem |
| `EMAIL_STAFF_ADDRESS` | Servidor | No se avisa al equipo de una reserva nueva |
| `AUTH_SOCIAL_PROVIDERS` | Servidor, **sin** `NEXT_PUBLIC_` | Ningún botón de red social. Vacía es el default |

Van a `.env.example` con su explicación. `AUTH_SOCIAL_PROVIDERS` es una lista separada por comas
(`google,apple`). Habilitar el proveedor en el panel de Supabase **no** alcanza: sin esta variable el
botón no existe (ADR-039). `check:secrets` sigue verificando que ninguna clave secreta lleve el
prefijo que la manda al navegador.
