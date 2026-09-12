import Link from "next/link";

import { Container } from "@/components/design-system/layout";
import type { SiteContent, UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import { intlLocale, type Locale } from "@/src/i18n/locale";
import { formatLongDate } from "@/components/design-system/dates";

import { LEGAL_NAV, PRIMARY_NAV, SECONDARY_NAV } from "./navigation";

/**
 * Pie del mockup: banda bosque, nombre, navegación y legales.
 */
export function SiteFooter({
  locale,
  site,
  ui,
  legalUpdatedOn,
}: {
  locale: Locale;
  site: SiteContent;
  ui: UiContent;
  legalUpdatedOn: string;
}) {
  const updated = formatLongDate(legalUpdatedOn, intlLocale(locale));

  return (
    <footer className="bg-forest text-paper" data-tone="forest">
      <Container className="py-3xl">
        <div className="grid gap-2xl lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-display text-heading">{site.name}</p>
            <p className="mt-sm max-w-measure text-small text-paper-muted">
              {site.place.locality}, {site.place.province}.
            </p>
          </div>

          <nav aria-label={ui.nav.campaign} className="lg:col-span-4">
            <p
              data-kicker=""
              className="mb-md font-ui text-label uppercase tracking-label text-paper-muted"
            >
              {ui.nav.campaign}
            </p>
            <ul className="space-y-xs">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={localizedHref(item.href, locale)}
                    className="inline-flex min-h-touch items-center text-body underline decoration-paper/30 decoration-1 underline-offset-4 hover:decoration-paper"
                  >
                    {ui.primaryNav[item.href].label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={ui.nav.project} className="lg:col-span-4">
            <p
              data-kicker=""
              className="mb-md font-ui text-label uppercase tracking-label text-paper-muted"
            >
              {ui.nav.next}
            </p>
            <ul className="space-y-xs">
              {SECONDARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={localizedHref(item.href, locale)}
                    className="inline-flex min-h-touch items-center text-body underline decoration-paper/30 decoration-1 underline-offset-4 hover:decoration-paper"
                  >
                    {ui.secondaryNav[item.href].label}
                  </Link>
                </li>
              ))}
            </ul>

            <p
              data-kicker=""
              className="mb-md mt-xl font-ui text-label uppercase tracking-label text-paper-muted"
            >
              {ui.nav.legal}
            </p>
            <ul className="space-y-xs">
              {LEGAL_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={localizedHref(item.href, locale)}
                    className="inline-flex min-h-touch items-center text-small text-paper-muted underline decoration-paper/30 decoration-1 underline-offset-4 hover:decoration-paper"
                  >
                    {ui.legalNav[item.href].label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-2xl max-w-measure text-small text-paper-muted">
          {fill(ui.footerNote, { date: updated })}
        </p>
      </Container>
    </footer>
  );
}
