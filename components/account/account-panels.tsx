import type { ReactNode } from "react";

import { OwnPledges } from "@/components/account/own-pledges";
import { ChangePasswordForm } from "@/components/account/password-form";
import { PortraitForm } from "@/components/account/portrait-form";
import {
  DeleteAccountForm,
  ProfileForm,
  SignOutForm,
} from "@/components/account/profile-forms";
import { SectionHeading } from "@/components/design-system/typography";
import type { AccountContent, CatalogContent } from "@/content/schema";
import {
  canAppearNamed,
  displayNameOf,
  type DonorProfile,
} from "@/src/domain/entities/donor";
import type { OwnPledge } from "@/src/domain/entities/donation-pledge";
import type { Locale } from "@/src/i18n/locale";

/**
 * Los cuatro paneles de `/cuenta`. Viven juntos porque la pantalla es una sola
 * decisión partida en un índice: no son cuatro páginas.
 */

function Panel({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div>
      <SectionHeading title={title} />
      <p className="mb-xl max-w-measure text-body text-ink-muted">{lead}</p>
      {children}
    </div>
  );
}

export function PledgesPanel({
  copy,
  catalog,
  locale,
  pledges,
}: {
  copy: AccountContent["profile"];
  catalog: CatalogContent;
  locale: Locale;
  pledges: readonly OwnPledge[];
}) {
  return (
    <Panel title={copy.pledgesHeading} lead={copy.pledgesLead}>
      <OwnPledges pledges={pledges} copy={copy} catalog={catalog} locale={locale} />
    </Panel>
  );
}

export function AppearancePanel({
  copy,
  errors,
  fields,
  locale,
  profile,
}: {
  copy: AccountContent["profile"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  locale: Locale;
  profile: DonorProfile;
}) {
  const name = displayNameOf(profile);

  return (
    <div className="space-y-3xl">
      <Panel title={copy.appearanceHeading} lead={copy.appearanceLead}>
        {/* El resumen se calcula con la misma función que decide el muro
            (`canAppearNamed`), así que no puede prometer algo distinto de lo que la
            base va a publicar. */}
        <p className="mb-xl max-w-measure font-ui text-small text-ink">
          {canAppearNamed(profile) ? `${copy.appearsAs} ${name}` : copy.appearsAnonymous}
        </p>
        <ProfileForm
          copy={copy}
          errors={errors}
          fields={fields}
          locale={locale}
          profile={profile}
        />
      </Panel>

      <Panel title={copy.portraitHeading} lead={copy.portraitLead}>
        <PortraitForm
          copy={copy}
          errors={errors}
          fields={fields}
          locale={locale}
          profile={profile}
        />
      </Panel>
    </div>
  );
}

export function AccessPanel({
  copy,
  errors,
  fields,
  locale,
  email,
  password,
}: {
  copy: AccountContent["profile"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  locale: Locale;
  email: string;
  password: AccountContent["password"];
}) {
  return (
    <div className="space-y-3xl">
      <div className="max-w-measure space-y-lg">
        <p className="font-ui text-small text-ink-muted">
          {copy.signedInAs} <span className="text-ink">{email}</span>
        </p>
        <SignOutForm copy={copy} locale={locale} />
      </div>

      <Panel title={copy.passwordHeading} lead={copy.passwordLead}>
        <ChangePasswordForm
          copy={password}
          errors={errors}
          fields={fields}
          locale={locale}
          saved={copy.saved}
        />
      </Panel>
    </div>
  );
}

export function DeletePanel({
  copy,
  errors,
  locale,
}: {
  copy: AccountContent["profile"];
  errors: AccountContent["errors"];
  locale: Locale;
}) {
  return (
    <Panel title={copy.deleteHeading} lead={copy.deleteLead}>
      <DeleteAccountForm copy={copy} errors={errors} locale={locale} />
    </Panel>
  );
}
