# ADR-003 · Supabase Auth con verificación por claims

**Estado**: Aceptada · **Fecha**: 2026-09-09

## Contexto

Sólo el backoffice necesita autenticación: entre dos y cinco personas, ninguna de ellas
desarrolladora. Cada verificación de sesión en cada página no debería costar un viaje de red, pero
tampoco puede confiarse en algo que no valide la firma del token.

## Decisión

Supabase Auth con email y contraseña. En el servidor se usa `@supabase/ssr` creando **un cliente por
request**, y la verificación se hace con **`getClaims()`**.

`proxy.ts` (el nombre que Next 16 le da a lo que antes era `middleware.ts`) hace únicamente un
redirect optimista. **No es una frontera de seguridad**: cada página y cada acción de `/admin`
revalida por su cuenta.

Los headers que `@supabase/ssr` entrega como segundo argumento de `setAll` se copian a la respuesta,
siempre.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| `getSession()` | Lee storage local sin revalidar. Usarlo para autorizar es el error clásico |
| `getUser()` en cada página | Cuesta un round-trip por render. Se reserva para cuando hace falta el registro fresco del usuario |
| Auth propia con cookies firmadas | Escribir autenticación a mano para cinco usuarios es exactamente el tipo de riesgo que no vale la pena |
| Magic links como único método | Depende de que el correo llegue; para quien administra desde el teléfono en una zona con conectividad intermitente, es peor |
| Confiar la protección a `proxy.ts` | CVE-2025-29927. Un middleware sorteable no es una frontera |

## Consecuencias

**Buenas.** `getClaims()` verifica la firma localmente con WebCrypto contra un JWKS cacheado: es
barato y confiable a la vez. La revalidación en cada acción hace que un bypass del proxy no alcance
para nada.

**Malas y aceptadas.**

- Hay que recordar copiar los headers de `setAll`. Si se olvidan, un CDN puede cachear un
  `Set-Cookie` y **servir la sesión de una persona a otra**. Queda como comentario explícito en el
  código, porque es el tipo de línea que alguien borra por parecer innecesaria.
- Un cliente por request no es opcional: los headers se entregan sólo en la primera escritura de
  cookie de cada cliente.
- Sin doble factor obligatorio en esta versión; depende del proveedor de identidad. Declarado como
  riesgo aceptado en el modelo de amenazas, a revisar antes de dar acceso a más personas.
