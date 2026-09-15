import {
  AccessPanel,
  AppearancePanel,
  DeletePanel,
  PledgesPanel,
} from "@/components/account/account-panels";
import { resolveAccountSection } from "@/components/account/account-section";
import { AccountTabs } from "@/components/account/account-tabs";
import { AuthShell } from "@/components/account/auth-shell";
import { SecondaryAction } from "@/components/design-system/actions";
import { Callout } from "@/components/design-system/callout";
import { getContent } from "@/content";
import { getOwnAccount } from "@/src/application/accounts/own-account";
import type { Locale } from "@/src/i18n/locale";
import { getAccountDeps } from "@/src/infrastructure/accounts/context";
import { isStaff, readViewer } from "@/src/infrastructure/auth/viewer";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * La propia cuenta.
 *
 * Muestra exactamente lo que el sistema guarda de una persona —el correo, el
 * retrato, el nombre que eligió, si quiere aparecer, en qué idioma se le escribe—
 * y nada más, porque eso es lo que `docs/privacy.md` promete que se puede ver
 * desde acá. Si algún día se guardara un dato más, tiene que aparecer en esta
 * pantalla o la política pasa a ser falsa.
 *
 * El índice son pestañas editoriales (`SectionTabs`): reservas, cómo aparecer,
 * acceso y borrar. Sin JavaScript se apilan. Quien tiene rol ve además el
 * backoffice, porque `/cuenta` ya es dinámica y no tiene que esperar al island.
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

  const [viewer, result] = await Promise.all([
    readViewer(),
    getOwnAccount(await getAccountDeps(), locale),
  ]);

  if (result.status === "error") {
    return (
      <AuthShell title={copy.title} lead={copy.lead} surface="sunk">
        <Callout tone="warning" title={copy.unavailableTitle}>
          {result.code === "notConfigured" ? copy.unavailableBody : errors[result.code]}
        </Callout>
      </AuthShell>
    );
  }

  const donor = result.value.profile;
  const pledges = result.value.pledges;
  const aviso =
    notice !== null && notice in errors ? errors[notice as keyof typeof errors] : null;
  const approval =
    donor.approvalStatus === "declined" ? (
      <Callout tone="warning" title={copy.declinedTitle}>
        {copy.declinedBody.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Callout>
    ) : donor.approvalStatus === "approved" ? (
      <p className="max-w-measure font-ui text-small text-ink-muted">
        {copy.approvedNote}
      </p>
    ) : (
      <p className="max-w-measure font-ui text-small text-ink-muted">
        {copy.pendingNote}
      </p>
    );
  const initial = resolveAccountSection(section, pledges.length > 0);

  return (
    <AuthShell title={copy.title} lead={copy.lead} surface="sunk">
      {aviso === null ? null : (
        <Callout tone="warning">
          <p>{aviso}</p>
        </Callout>
      )}
      {approval}

      {viewer !== null && isStaff(viewer) ? (
        <SecondaryAction href="/admin" className="mb-lg">
          {ui.backoffice}
        </SecondaryAction>
      ) : null}

      <div className={aviso === null && approval === null ? undefined : "mt-lg"}>
        <AccountTabs
          label={copy.tabsLabel}
          initial={initial}
          items={[
            {
              id: "reservas",
              label: copy.tabPledges,
              content: (
                <PledgesPanel
                  copy={copy}
                  catalog={catalog}
                  locale={locale}
                  pledges={pledges}
                />
              ),
            },
            {
              id: "aparecer",
              label: copy.tabAppearance,
              content: (
                <AppearancePanel
                  copy={copy}
                  errors={errors}
                  fields={fields}
                  locale={locale}
                  profile={donor}
                />
              ),
            },
            {
              id: "acceso",
              label: copy.tabAccess,
              content: (
                <AccessPanel
                  copy={copy}
                  errors={errors}
                  fields={fields}
                  locale={locale}
                  email={viewer?.email ?? "—"}
                  password={account.password}
                />
              ),
            },
            {
              id: "borrar",
              label: copy.tabDelete,
              content: <DeletePanel copy={copy} errors={errors} locale={locale} />,
            },
          ]}
        />
      </div>
    </AuthShell>
  );
}
