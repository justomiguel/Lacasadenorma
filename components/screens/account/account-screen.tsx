import { OwnPledges } from "@/components/account/own-pledges";
import { AuthShell } from "@/components/account/auth-shell";
import {
  DeleteAccountForm,
  ProfileForm,
  SignOutForm,
} from "@/components/account/profile-forms";
import { Callout } from "@/components/design-system/callout";
import { SectionHeading } from "@/components/design-system/typography";
import { getContent } from "@/content";
import { getOwnAccount } from "@/src/application/accounts/own-account";
import { canAppearNamed, displayNameOf } from "@/src/domain/entities/donor";
import type { Locale } from "@/src/i18n/locale";
import { getAccountDeps } from "@/src/infrastructure/accounts/context";
import { readViewer } from "@/src/infrastructure/auth/viewer";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * La propia cuenta.
 *
 * Muestra exactamente lo que el sistema guarda de una persona —el correo, el
 * nombre que eligió, si quiere aparecer, en qué idioma se le escribe— y nada más,
 * porque eso es lo que `docs/privacy.md` promete que se puede ver desde acá. Si
 * algún día se guardara un dato más, tiene que aparecer en esta pantalla o la
 * política pasa a ser falsa.
 *
 * Lo que todavía **no** está: el muro. Llega en la fase E.
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
}: {
  locale: Locale;
  notice: string | null;
}) {
  const { account, catalog } = getContent(locale);
  const { profile: copy, fields, errors } = account;

  const [viewer, result] = await Promise.all([
    readViewer(),
    getOwnAccount(await getAccountDeps(), locale),
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
  const name = displayNameOf(donor);
  const aviso =
    notice !== null && notice in errors ? errors[notice as keyof typeof errors] : null;
  const approval =
    donor.approvalStatus === "pending" ? (
      <Callout tone="warning" title={copy.pendingTitle}>
        {copy.pendingBody.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Callout>
    ) : donor.approvalStatus === "declined" ? (
      <Callout tone="warning" title={copy.declinedTitle}>
        {copy.declinedBody.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Callout>
    ) : (
      <p className="max-w-measure font-ui text-small text-ink-muted">
        {copy.approvedNote}
      </p>
    );

  return (
    <AuthShell title={copy.title} lead={copy.lead}>
      {aviso === null ? null : (
        <Callout tone="warning">
          <p>{aviso}</p>
        </Callout>
      )}
      {approval}

      <div className="max-w-measure space-y-lg">
        <p className="font-ui text-small text-ink-muted">
          {copy.signedInAs} <span className="text-ink">{viewer?.email ?? "—"}</span>
        </p>
        <SignOutForm copy={copy} locale={locale} />
      </div>

      <div className="mt-3xl">
        <SectionHeading title={copy.pledgesHeading} />
        <p className="mb-xl max-w-measure text-body text-ink-muted">{copy.pledgesLead}</p>
        <OwnPledges pledges={pledges} copy={copy} catalog={catalog} locale={locale} />
      </div>

      <div className="mt-3xl">
        <SectionHeading title={copy.appearanceHeading} />
        <p className="mb-xl max-w-measure text-body text-ink-muted">
          {copy.appearanceLead}
        </p>

        {/* El resumen se calcula con la misma función que decide el muro
            (`canAppearNamed`), así que no puede prometer algo distinto de lo que la
            base va a publicar. */}
        <p className="mb-xl max-w-measure font-ui text-small text-ink">
          {canAppearNamed(donor) ? `${copy.appearsAs} ${name}` : copy.appearsAnonymous}
        </p>

        <ProfileForm
          copy={copy}
          errors={errors}
          fields={fields}
          locale={locale}
          profile={donor}
        />
      </div>

      <div className="mt-3xl border-t border-rule pt-2xl">
        <SectionHeading title={copy.deleteHeading} rule={false} />
        <p className="mb-xl max-w-measure text-body text-ink-muted">{copy.deleteLead}</p>
        <DeleteAccountForm copy={copy} errors={errors} locale={locale} />
      </div>
    </AuthShell>
  );
}
