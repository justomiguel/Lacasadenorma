#!/usr/bin/env node
/**
 * API local compatible con Supabase, sin Docker (amplía el ADR-013).
 *
 * ## Por qué existe
 *
 * `scripts/db-local.sh` da una base de datos real con las migraciones y las
 * policies aplicadas, y eso alcanza para pgTAP. Lo que no da es **PostgREST**, y
 * sin PostgREST el código que de verdad se despliega —los repositorios de
 * `src/infrastructure/supabase/`— no se ejecuta nunca fuera de producción. Sus
 * mapeadores, sus `select` con columnas nombradas y su manejo de errores quedarían
 * sin verificar hasta el primer despliegue, que es el peor momento para
 * descubrir que una columna no existe.
 *
 * Esto levanta PostgREST contra la base local y lo publica en la forma que espera
 * `@supabase/supabase-js`: el prefijo `/rest/v1`. Con eso, `npm run dev`, las
 * pruebas E2E y la revisión visual usan exactamente el mismo camino de datos que
 * producción.
 *
 * ## La parte de autenticación, y dónde está el límite
 *
 * `/auth/v1` implementa las cuatro rutas que usa el backoffice: entrar, leer el
 * usuario del token, renovar y salir. Existe por el flujo crítico 9 —publicar una
 * novedad—, que sin una sesión no se puede recorrer, y que antes era un
 * procedimiento manual del runbook.
 *
 * El límite importa más que la lista de rutas, porque una prueba que verifica el
 * doble en lugar del original no verifica nada. Lo que acá es **real**:
 *
 * - La contraseña se compara con bcrypt contra `auth.users.encrypted_password`,
 *   con `extensions.crypt()`, igual que la guarda la plataforma.
 * - Los claims del token los arma `public.custom_access_token_hook`, la función de
 *   la migración, invocada **con el rol `supabase_auth_admin`**: los mismos
 *   privilegios que tiene el servidor de auth allá. Esto ya encontró un `grant`
 *   que faltaba (migración 20260910090000).
 * - El token se firma con el secreto que PostgREST valida, así que las policies
 *   RLS deciden cada lectura y cada escritura de la sesión.
 * - `GET /user` **verifica la firma HMAC y el vencimiento** antes de contestar. No
 *   es un detalle: `getClaims()` de supabase-js, cuando el token es HS256, delega
 *   la verificación justamente en esta ruta. Si contestara 200 sin mirar la firma,
 *   un token fabricado pasaría y la propiedad que se quiere probar sería falsa.
 *
 * Lo que acá es un **sustituto**: la superficie HTTP de GoTrue y la administración
 * de la sesión (emitir, rotar y vencer refresh tokens, que viven en memoria de este
 * proceso en lugar de en `auth.refresh_tokens`). Es transporte; no es donde se
 * decide una autorización.
 *
 * Lo que sigue sin existir: registro, recuperación de contraseña, OAuth, MFA,
 * Storage y Realtime. Cualquier otra ruta de `/auth/v1` responde 501 con un mensaje
 * explícito en lugar de fallar raro.
 *
 * ## Sobre las credenciales de este archivo
 *
 * La clave anónima que imprime es un JWT firmado con un secreto de desarrollo que
 * está escrito acá. **No es un secreto**: sólo sirve contra esta base, que se
 * borra entera en cada reset.
 *
 * Uso: node scripts/local-api.mjs
 *      node scripts/local-api.mjs --print-anon-key   (sólo imprime la clave)
 */

import { ANON_KEY } from "./local-api/jwt.mjs";
import { startLocalApi } from "./local-api/server.mjs";

/**
 * `scripts/e2e.sh` necesita la misma clave para construir el sitio, y copiarla allá
 * dejaría dos definiciones de una credencial que se desincronizan.
 */
if (process.argv.includes("--print-anon-key")) {
  process.stdout.write(`${ANON_KEY}\n`);
  process.exit(0);
}

await startLocalApi();
