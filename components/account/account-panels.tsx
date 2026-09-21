import type { ReactNode } from "react";

import { OwnPledges } from "@/components/account/own-pledges";
import { ChangePasswordForm } from "@/components/account/password-form";
import { PortraitForm } from "@/components/account/portrait-form";
import { DeleteAccountForm, ProfileForm } from "@/components/account/profile-forms";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import {
  BoxIcon,
  CameraIcon,
  EyeIcon,
  LockIcon,
  TrashIcon,
} from "@/components/design-system/icons";
import { SectionHeading } from "@/components/design-system/typography";
import type { AccountContent, CatalogContent } from "@/content/schema";
import {
  canAppearNamed,
  displayNameOf,
  type DonorProfile,
} from "@/src/domain/entities/donor";
import type { DonationItem } from "@/src/domain/entities";
import type { OwnPledge } from "@/src/domain/entities/donation-pledge";
import type { Locale } from "@/src/i18n/locale";

/**
 * Los cuatro paneles de `/cuenta`. Viven juntos porque la pantalla es una sola
 * decisión partida en un índice: no son cuatro páginas.
 */

function Panel({
  title,
  lead,
  mark,
  id,
  children,
}: {
  title: string;
  lead: string;
  mark: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  return (
    <div
      {...(id === undefined ? {} : { id })}
      className={id === undefined ? undefined : "scroll-mt-header"}
    >
      <SectionHeading
        title={title}
        mark={<IdentifyingMark className="text-olive">{mark}</IdentifyingMark>}
      />
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
  items,
}: {
  copy: AccountContent["profile"];
  catalog: CatalogContent;
  locale: Locale;
  pledges: readonly OwnPledge[];
  items: readonly DonationItem[];
}) {
  return (
    <Panel title={copy.pledgesHeading} lead={copy.pledgesLead} mark={<BoxIcon />}>
      <OwnPledges
        pledges={pledges}
        items={items}
        copy={copy}
        catalog={catalog}
        locale={locale}
      />
    </Panel>
  );
}

export function PortraitPanel({
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
  return (
    <Panel
      id="foto"
      title={copy.portraitHeading}
      lead={copy.portraitLead}
      mark={<CameraIcon />}
    >
      <PortraitForm
        copy={copy}
        errors={errors}
        fields={fields}
        locale={locale}
        profile={profile}
      />
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
    <Panel
      id="aparecer"
      title={copy.appearanceHeading}
      lead={copy.appearanceLead}
      mark={<EyeIcon />}
    >
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
  );
}

export function AccessPanel({
  copy,
  errors,
  fields,
  locale,
  password,
}: {
  copy: AccountContent["profile"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  locale: Locale;
  password: AccountContent["password"];
}) {
  return (
    <Panel
      id="acceso"
      title={copy.passwordHeading}
      lead={copy.passwordLead}
      mark={<LockIcon />}
    >
      <ChangePasswordForm
        copy={password}
        errors={errors}
        fields={fields}
        locale={locale}
        saved={copy.saved}
      />
    </Panel>
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
    <Panel
      id="borrar"
      title={copy.deleteHeading}
      lead={copy.deleteLead}
      mark={<TrashIcon />}
    >
      <DeleteAccountForm copy={copy} errors={errors} locale={locale} />
    </Panel>
  );
}
