import { Footer } from "@/components/site/footer";
import { HelpBar } from "@/components/site/help-bar";
import { SiteHeader } from "@/components/site/header";
import { WebMcpEndpoint } from "@/components/site/webmcp-endpoint";
import { getContent } from "@/content";
import { organizationSchema } from "@/src/infrastructure/seo/structured-data";
import type { Locale } from "@/src/i18n/locale";
import { localizeHref } from "@/src/i18n/locale";

export function DocumentShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const { site, ui } = getContent(locale);
  return (
    <>
      <a href="#contenido" className="skip-link">
        {ui.skipToContent}
      </a>
      <SiteHeader locale={locale} siteName={site.name} ui={ui} />
      <main id="contenido">{children}</main>
      <Footer locale={locale} siteName={site.name} ui={ui} />
      <HelpBar
        locale={locale}
        href={localizeHref("/ayudar", locale)}
        label={ui.helpCta}
      />
      <WebMcpEndpoint />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema(site.url, locale)),
        }}
      />
    </>
  );
}
