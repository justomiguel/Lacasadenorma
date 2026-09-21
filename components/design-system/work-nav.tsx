import Link from "next/link";

import {
  ACCOUNT_SECTION_PARAM,
  accountSettingsHref,
  isAccountSettingsSection,
  type AccountSection,
} from "@/components/account/account-section";
import type { AdminSection } from "@/components/admin/nav";
import { AdminNav } from "@/components/admin/nav-bar";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import { BoxIcon, GridIcon, PersonIcon } from "@/components/design-system/icons";
import { sidebarItemClass } from "@/components/design-system/work-sidebar";
import type { AccountContent } from "@/content/schema";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * El menú de trabajo: mis donaciones, la cuenta, y el backoffice agrupado.
 *
 * Tu cuenta es una página. Campaña y Plata se agrupan; Catálogo,
 * Donaciones y Donantes van cada uno al costado. Las pestañas de un
 * grupo viven en el contenedor.
 */
export function WorkNav({
  locale,
  copy,
  currentAccount,
  adminSections,
  backofficeLabel,
}: {
  locale: Locale;
  copy: AccountContent["profile"];
  currentAccount: AccountSection | null;
  adminSections: readonly AdminSection[];
  backofficeLabel: string;
}) {
  const accountHref = localizedHref("/cuenta", locale);
  const settingsOpen =
    currentAccount !== null && isAccountSettingsSection(currentAccount);
  const settingsHref = accountSettingsHref(accountHref);

  return (
    <nav aria-label={copy.tabsLabel}>
      <ul className="flex flex-col gap-xs">
        <li>
          <Link
            href={`${accountHref}?${ACCOUNT_SECTION_PARAM}=reservas`}
            className={sidebarItemClass(currentAccount === "reservas")}
            {...(currentAccount === "reservas"
              ? { "aria-current": "page" as const }
              : {})}
          >
            <IdentifyingMark>
              <BoxIcon />
            </IdentifyingMark>
            {copy.tabPledges}
          </Link>
        </li>
        <li>
          <Link
            href={settingsHref}
            className={sidebarItemClass(settingsOpen)}
            {...(settingsOpen ? { "aria-current": "page" as const } : {})}
          >
            <IdentifyingMark>
              <PersonIcon />
            </IdentifyingMark>
            {copy.title}
          </Link>
        </li>
        {adminSections.length === 0 ? null : (
          <li>
            <Link href="/admin" className={sidebarItemClass(false)}>
              <IdentifyingMark>
                <GridIcon />
              </IdentifyingMark>
              {backofficeLabel}
            </Link>
            <AdminNav sections={adminSections} />
          </li>
        )}
      </ul>
    </nav>
  );
}
