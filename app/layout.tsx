import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { HelpBar } from "@/components/site/help-bar";
import { StructuredData } from "@/components/site/structured-data";
import { WebMcpTools } from "@/components/site/webmcp";
import { site } from "@/content";
import {
  graph,
  organizationSchema,
  webSiteSchema,
} from "@/src/infrastructure/seo/structured-data";
import { getSiteUrl } from "@/src/infrastructure/site-url";

import { archivo, newsreader } from "./fonts";
import "./globals.css";

/**
 * `metadataBase` hace que todas las URLs relativas de metadata —canónicas,
 * OpenGraph, sitemap— se resuelvan contra el origen real. Sin esto, las vistas
 * previas de WhatsApp se rompen en silencio.
 */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.shortDescription,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.shortDescription,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.shortDescription,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // El color de la barra del navegador es el papel del sitio: en mobile la
  // diferencia entre un sitio y una página se nota en este detalle.
  themeColor: "#fbf9f5",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const siteUrl = getSiteUrl();

  return (
    <html lang="es-AR" className={`${newsreader.variable} ${archivo.variable}`}>
      <head>
        {/* Resumen del sitio para agentes y motores de respuesta. No sustituye al
            SEO tradicional; es un archivo más, barato de mantener. */}
        <link rel="describedby" href="/llms.txt" type="text/plain" />

        {/* La organización y el sitio se declaran una vez, en el layout: son los
            dos nodos a los que se refieren todos los demás por `@id`. */}
        <StructuredData
          json={graph([organizationSchema(siteUrl), webSiteSchema(siteUrl)])}
        />
      </head>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-md focus:top-md focus:z-20 focus:rounded-sm focus:bg-ink focus:px-md focus:py-xs focus:font-ui focus:text-small focus:text-paper"
        >
          Ir al contenido
        </a>

        <SiteHeader />

        <main id="contenido">{children}</main>

        <SiteFooter />
        <HelpBar />
        <WebMcpTools />
      </body>
    </html>
  );
}
