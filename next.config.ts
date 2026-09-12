import type { NextConfig } from "next";

/**
 * Origen de Supabase para `img-src` e `images.remotePatterns`. Sin proyecto
 * configurado no se agrega ningún origen externo: la CSP queda más cerrada, no
 * más abierta.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : null;

/**
 * ¿El sitio se sirve por http?
 *
 * Sólo puede pasar en desarrollo y en las pruebas E2E, que corren el servidor de
 * producción en `127.0.0.1`. Cuando pasa, hay dos cabeceras que **hay que omitir**:
 *
 * - `upgrade-insecure-requests`, que le pide al navegador que reescriba a https todo
 *   lo que la página cargue. Chromium exceptúa los orígenes locales; **WebKit no**, y
 *   el resultado es que la hoja de estilos, las fuentes y todo el JavaScript fallan
 *   con un error de TLS contra un servidor que no habla https. La página se sirve
 *   entera y sin estilos, y lo que se rompe primero es lo que menos se sospecha: los
 *   objetivos táctiles quedan en 22 px y axe reporta docenas de violaciones de
 *   contraste y de tamaño que no existen. Se descubrió exactamente así.
 * - `Strict-Transport-Security`, que un navegador ignora sobre http de todos modos,
 *   pero que declarado ahí es una afirmación falsa sobre el despliegue.
 *
 * Sin variable configurada se asume https, que es el caso de producción: la duda se
 * resuelve del lado seguro.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const servesOverHttp = siteUrl !== undefined && siteUrl.startsWith("http://");

/**
 * Origen del script de analítica, si hay uno configurado (ADR-010).
 *
 * La CSP y la analítica están acopladas y conviene decirlo en voz alta: con
 * `script-src 'self'`, configurar el proveedor no alcanza —el navegador bloquea el
 * script y no llega ningún evento—. El origen se deriva de la misma variable que
 * inyecta el script, así que las dos cosas no pueden divergir. Sin variable, la
 * política no se abre ni un milímetro.
 */
const analyticsScript = process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL?.trim();
const analyticsOrigin =
  analyticsScript !== undefined && analyticsScript.length > 0
    ? new URL(analyticsScript).origin
    : null;

/** Los orígenes externos que la política permite, ya sin nulos ni repetidos. */
function allow(...origins: readonly (string | null)[]): string {
  const unique = [...new Set(origins.filter((origin) => origin !== null))];

  return unique.length === 0 ? "" : ` ${unique.join(" ")}`;
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `img-src 'self' data: blob:${allow(supabaseOrigin)}`,
  "font-src 'self'",
  // Next inyecta estilos en línea; eliminar 'unsafe-inline' exigiría una
  // arquitectura de nonces para estilos. Declarado como deuda conocida en
  // specs/001-sitio-publico-campana/threat-model.md.
  "style-src 'self' 'unsafe-inline'",
  // `'unsafe-eval'` sólo en desarrollo. React lo necesita para reconstruir stacks
  // entre entornos y para el refresco en caliente; en producción no lo usa nunca.
  // Sin esta distinción, la consola de desarrollo se llena de errores de CSP y el
  // ruido esconde los errores de verdad (principio X).
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}${allow(analyticsOrigin)}`,
  `connect-src 'self'${allow(supabaseOrigin, analyticsOrigin)}`,
  "manifest-src 'self'",
  ...(servesOverHttp ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ...(servesOverHttp
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // No se envía `Origin-Agent-Cluster: ?0`: desactivaría WebMCP y debilitaría
  // la frontera de origen. Ver docs/adr/008-webmcp.md.
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // cacheComponents queda deshabilitado a propósito. Ver docs/adr/011.
  typedRoutes: true,

  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 80],
    // El protocolo sale de la URL configurada y no está fijado en `https`: la API
    // local de desarrollo es `http` en 127.0.0.1, y fijarlo haría que las fotos no
    // cargaran localmente por un motivo que no se ve en ninguna parte.
    ...(supabaseOrigin
      ? {
          remotePatterns: [
            {
              protocol: new URL(supabaseOrigin).protocol.replace(":", "") as
                "http" | "https",
              hostname: new URL(supabaseOrigin).hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ],
        }
      : {}),
  },

  async redirects() {
    return [
      { source: "/es", destination: "/", permanent: true },
      { source: "/es/:path*", destination: "/:path*", permanent: true },
    ];
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Las rutas autenticadas nunca se cachean en un intermediario.
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
