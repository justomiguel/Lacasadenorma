# ADR-053 · El stack va a los logs; al navegador, detrás de un toggle

**Estado**: Aceptada · **Fecha**: 2026-09-18

Enmienda el principio X de la constitución y la amenaza I6: el detalle técnico
no se le sirve a quien visita, salvo que se prenda `SHOW_ERROR_STACK`.

## Contexto

Durante la marcha blanca un `POST` a
`/rest/v1/rpc/record_email_delivery` contestó **401** y no quedó nada útil en
los logs de Vercel. El logger serializaba un `Error` con `name` y `message` y
tiraba el `stack`. `QueryError` no copiaba `status`, `details` ni `hint` de
PostgREST. El `catch` de después de reservar (FR-233) tragaba el fallo para no
deshacer la donación, y no hay `error.tsx`: Next devolvía la página de éxito y
el 401 sólo se veía en la red.

El pedido fue ver el stack en el navegador para no ir a los logs. En marcha
blanca eso no puede ser el default: el sitio es público, y un stack en
producción filtra rutas, RPCs y a veces un rastro de quién llamó.

## Decisión

1. **Los logs de producción siempre llevan el stack**, más `code`, `details`,
   `hint` y `status` cuando el error los tiene. Redacción de claves sensibles
   igual que hasta ahora. Eso es lo que se mira si no se prende el toggle.
2. **Quien visita ve un estado de error diseñado**, con un mensaje
   comprensible. Lo impone `app/error.tsx` y `app/global-error.tsx`. Un 500
   genérico de Next no es un estado diseñado.
3. **El stack en el navegador es un toggle**, no el default.
   `SHOW_ERROR_STACK=1` en el entorno del servidor. Sin prefijo
   `NEXT_PUBLIC_`: no viaja al bundle. Se cambia en Vercel y se redeploya. En
   desarrollo (`NODE_ENV !== "production"`) el stack ya llega a `error.tsx` y
   se muestra. En producción, sólo con el toggle: un overlay o la página de
   error piden `/api/diagnostico`.
4. **Un fallo de correo no deshace la reserva** (FR-233). Si el toggle está
   prendido, ese fallo igual se ve: cookie corta con el diagnóstico, overlay
   encima de la página que sí salió.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Stack en el navegador para todo el mundo, en producción | Filtra el interior del servidor a cualquiera que dispare un error. En marcha blanca no |
| Seguir sin `error.tsx` y mirar Vercel | Fue exactamente el fallo: el 401 no estaba en los logs, y había que adivinar |
| Un query `?stack=1` o una cookie que cualquiera setea | El diagnóstico quedaría a un link de distancia. El toggle es de quien opera el sitio |
| `NEXT_PUBLIC_SHOW_ERROR_STACK` | El bundle anunciaría que el modo existe. El servidor decide; el cliente muestra lo que el servidor le da |
| Sacar el `catch` de después de reservar para que el 401 rompa la página | La reserva ya está hecha. Mentir que falló invita a reintentar |

## Consecuencias

**Buenas.** Un 401 deja de ser un POST mudo: el log trae status y stack. Con el
toggle, el mismo diagnóstico se lee en el navegador. Sin el toggle, quien
dona ve un mensaje y nada más.

**Malas y aceptadas.**

- Con el toggle prendido, cualquiera que dispare un error ve el stack. Es el
  precio de diagnosticar en marcha blanca sin SSH. Se apaga cuando deja de
  hacer falta.
- Cambiar `SHOW_ERROR_STACK` en Vercel pide redeploy: no es `NEXT_PUBLIC_`,
  pero las funciones serverless toman el entorno del despliegue.
- El mapa en memoria de `/api/diagnostico` es por instancia. Si el render del
  `error.tsx` cae en otra, queda el digest para cruzar con los logs.
