import type { NextConfig } from "next";

/**
 * Origen de Supabase para `img-src` e `images.remotePatterns`. Sin proyecto
 * configurado no se agrega ningún origen externo: la CSP queda más cerrada, no
 * más abierta.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : null;

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "font-src 'self'",
  // Next inyecta estilos en línea; eliminar 'unsafe-inline' exigiría una
  // arquitectura de nonces para estilos. Declarado como deuda conocida en
  // specs/001-sitio-publico-campana/threat-model.md.
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
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
    ...(supabaseOrigin
      ? {
          remotePatterns: [
            {
              protocol: "https" as const,
              hostname: new URL(supabaseOrigin).hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ],
        }
      : {}),
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
