/**
 * Origen público del sitio.
 *
 * Se resuelve en este orden y por un motivo concreto en cada paso:
 *
 * 1. `NEXT_PUBLIC_SITE_URL`, que es el dominio real en producción.
 * 2. `VERCEL_PROJECT_PRODUCTION_URL`, para que un despliegue de producción sin la
 *    variable configurada siga emitiendo canónicas correctas.
 * 3. `VERCEL_URL`, que en un preview cambia en cada despliegue: sirve para que las
 *    vistas previas de OpenGraph funcionen en el preview.
 * 4. `localhost`, en desarrollo.
 *
 * Nunca devuelve una cadena vacía: una URL canónica vacía es peor que una
 * incorrecta, porque rompe la metadata sin que nadie lo note.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (explicit !== undefined && explicit.length > 0) {
    return explicit.replace(/\/$/, "");
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (productionHost !== undefined && productionHost.length > 0) {
    return `https://${productionHost}`;
  }

  const previewHost = process.env.VERCEL_URL;

  if (previewHost !== undefined && previewHost.length > 0) {
    return `https://${previewHost}`;
  }

  return `http://localhost:${process.env.PORT ?? "3000"}`;
}
