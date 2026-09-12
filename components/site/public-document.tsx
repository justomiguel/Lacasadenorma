import { AnalyticsScript } from "@/components/site/analytics";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { HelpBar } from "@/components/site/help-bar";
import { StructuredData } from "@/components/site/structured-data";
import { WebMcpTools } from "@/components/site/webmcp";
import { UiProvider } from "@/components/i18n/ui-provider";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import { htmlLang, type Locale } from "@/src/i18n/locale";
import {
  graph,
  organizationSchema,
  webSiteSchema,
} from "@/src/infrastructure/seo/structured-data";
import { getSiteUrl } from "@/src/infrastructure/site-url";

import { archivo, newsreader, newsreaderItalic } from "@/app/fonts";
import "@/app/globals.css";

/**
 * El documento público: un root layout por idioma (ADR-023).
 *
 * `html lang` sale de acá, no de un `headers()` ni de un efecto. Las páginas
 * siguen siendo estáticas. El `UiProvider` recibe **un** paquete de interfaz, el
 * de este idioma: es lo que pueden leer CopyField y ShareRow sin importar JSON.
 */
export function PublicDocument({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const { site, ui, legal } = getContent(locale);
  const siteUrl = getSiteUrl();

  return (
    <html
      lang={htmlLang(locale)}
      className={`${newsreader.variable} ${archivo.variable} ${newsreaderItalic.variable}`}
    >
      <head>
        <link rel="describedby" href="/llms.txt" type="text/plain" />
        <StructuredData
          json={graph([
            organizationSchema(siteUrl, locale),
            webSiteSchema(siteUrl, locale),
          ])}
        />
        <AnalyticsScript />
      </head>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <UiProvider locale={locale} ui={ui}>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:left-md focus:top-md focus:z-20 focus:rounded-sm focus:bg-ink focus:px-md focus:py-xs focus:font-ui focus:text-small focus:text-paper"
          >
            {ui.skipToContent}
          </a>

          <SiteHeader locale={locale} siteName={site.name} ui={ui} />

          <main id="contenido">{children}</main>

          <SiteFooter
            locale={locale}
            site={site}
            ui={ui}
            legalUpdatedOn={legal.updatedOn}
          />
          <HelpBar href={localizedHref("/ayudar", locale)} label={ui.helpCta} />
          <WebMcpTools />
        </UiProvider>
      </body>
    </html>
  );
}
