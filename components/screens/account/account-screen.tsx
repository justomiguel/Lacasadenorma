import { AccountSettings } from "@/components/account/account-settings";
import { PledgesPanel } from "@/components/account/account-panels";
import { AccountSignOut } from "@/components/account/account-nav";
import {
  isAccountSettingsSection,
  resolveAccountSection,
} from "@/components/account/account-section";
import { AuthShell } from "@/components/account/auth-shell";
import { ADMIN_SECTIONS } from "@/components/admin/nav";
import { Callout } from "@/components/design-system/callout";
import { WorkNav } from "@/components/design-system/work-nav";
import { WorkSidebar } from "@/components/design-system/work-sidebar";
import { getContent } from "@/content";
import { getOwnAccount } from "@/src/application/accounts/own-account";
import { getCatalog } from "@/src/application/use-cases/get-catalog";
import { isVisibleOwnPledge } from "@/src/domain/entities/donation-pledge";
import { can } from "@/src/domain/permissions";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getAccountDeps } from "@/src/infrastructure/accounts/context";
import { isStaff, readViewer } from "@/src/infrastructure/auth/viewer";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * La propia cuenta.
 *
 * Muestra exactamente lo que el sistema guarda de una persona —el correo, el
 * retrato, el nombre que eligió, si quiere aparecer, en qué idioma se le escribe—
 * y nada más. El menú al costado tiene mis donaciones y la cuenta. Cómo aparecer,
 * la foto, el acceso y borrar son una página. Quien tiene rol ve el backoffice
 * como submenú, siempre abierto.
 */

export function accountMetadata(locale: Locale) {
  const { account } = getContent(locale);

  return pageMetadata({
    locale,
    title: account.profile.title,
    description: account.profile.seoDescription,
    path: "/cuenta",
    noIndex: true,
  });
}

export async function AccountScreen({
  locale,
  notice,
  section,
}: {
  locale: Locale;
  notice: string | null;
  section: string | null;
}) {
  const { account, catalog, ui } = getContent(locale);
  const { profile: copy, fields, errors } = account;

  const [viewer, result, catalogResult] = await Promise.all([
    readViewer(),
    getOwnAccount(await getAccountDeps(), locale),
    getCatalog({ dataLayer: getPublicDataLayer(), logger }),
  ]);

  if (result.status === "error") {
    return (
      <AuthShell title={copy.title} lead={copy.lead}>
        <Callout tone="warning" title={copy.unavailableTitle}>
          {result.code === "notConfigured" ? copy.unavailableBody : errors[result.code]}
        </Callout>
      </AuthShell>
    );
  }

  const donor = result.value.profile;
  const pledges = result.value.pledges;
  const items = catalogResult.status === "ok" ? catalogResult.data : [];
  const aviso =
    notice !== null && notice in errors ? errors[notice as keyof typeof errors] : null;
  const current = resolveAccountSection(
    section,
    pledges.some((pledge) => isVisibleOwnPledge(pledge)),
  );
  const adminSections =
    viewer !== null && isStaff(viewer)
      ? ADMIN_SECTIONS.filter((item) => can(viewer.role, item.permission))
      : [];

  return (
    <WorkSidebar
      accountHref={localizedHref("/cuenta", locale)}
      emptyName={ui.account}
      nav={
        <WorkNav
          locale={locale}
          copy={copy}
          currentAccount={current}
          adminSections={adminSections}
          backofficeLabel={ui.backoffice}
        />
      }
      footer={
        <AccountSignOut
          locale={locale}
          label={copy.signOut}
          pendingLabel={copy.signingOut}
        />
      }
    >
      {aviso === null ? null : (
        <div className="mb-xl">
          <Callout tone="warning">
            <p>{aviso}</p>
          </Callout>
        </div>
      )}

      {current === "reservas" ? (
        <PledgesPanel
          copy={copy}
          catalog={catalog}
          locale={locale}
          pledges={pledges}
          items={items}
        />
      ) : null}
      {isAccountSettingsSection(current) ? (
        <AccountSettings
          locale={locale}
          copy={copy}
          errors={errors}
          fields={fields}
          profile={donor}
          password={account.password}
          initial={current}
        />
      ) : null}
    </WorkSidebar>
  );
}
