import Link from "next/link";

import { formatLongDate } from "@/components/design-system/dates";
import { Container } from "@/components/design-system/layout";
import type { SiteContent, UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import { intlLocale, type Locale } from "@/src/i18n/locale";

import { SiteMark } from "./mark";
import { ACCOUNT_HREF, LEGAL_NAV, PRIMARY_NAV, SECONDARY_NAV } from "./navigation";

const LINK =
  "inline-flex min-h-touch items-center font-ui text-small text-ink-muted transition-colors duration-fast hover:text-ink";

/**
 * Pie editorial (ADR-032): un colofón, no un mapa del sitio.
 *
 * El nombre, el lugar, una fila de enlaces chicos y la línea legal. Sobre papel,
 * con una regla arriba: el pie no compite con la barra de ayudar del teléfono, que
 * es lo último que se ve.
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
    <footer className="border-t border-rule">
      <Container className="py-2xl lg:py-3xl">
        <div className="flex items-center gap-sm">
          <SiteMark size="2xl" />
          <p className="font-display text-section-title">
            {site.name}.
            <span className="block text-ink-muted">
              {site.place.locality}, {site.place.province}.
            </span>
          </p>
        </div>

        <nav aria-label={ui.nav.footer} className="mt-xl">
          <ul className="flex flex-wrap gap-x-lg">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link href={localizedHref(item.href, locale)} className={LINK}>
                  {ui.primaryNav[item.href].shortLabel}
                </Link>
              </li>
            ))}
            {SECONDARY_NAV.map((item) => (
              <li key={item.href}>
                <Link href={localizedHref(item.href, locale)} className={LINK}>
                  {ui.secondaryNav[item.href].label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={localizedHref(ACCOUNT_HREF, locale)} className={LINK}>
                {ui.signIn}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="mt-lg border-t border-rule pt-md lg:flex lg:items-baseline lg:justify-between lg:gap-xl">
          <ul className="flex flex-wrap gap-x-lg">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link href={localizedHref(item.href, locale)} className={LINK}>
                  {ui.legalNav[item.href].label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-sm max-w-measure font-ui text-caption text-ink-muted lg:mt-0">
            {fill(ui.footerNote, { date: updated })}
          </p>
        </div>
      </Container>
    </footer>
  );
}
