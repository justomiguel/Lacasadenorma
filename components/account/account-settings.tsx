import { AccountBlockFocus } from "@/components/account/account-block-focus";
import {
  accountBlockId,
  type AccountSettingsSection,
} from "@/components/account/account-section";
import {
  AccessPanel,
  AppearancePanel,
  DeletePanel,
  PortraitPanel,
} from "@/components/account/account-panels";
import type { AccountContent } from "@/content/schema";
import type { DonorProfile } from "@/src/domain/entities/donor";
import type { Locale } from "@/src/i18n/locale";

/**
 * Tu foto, cómo aparecer, acceso y borrar: una página, sin pestañas.
 */
export function AccountSettings({
  locale,
  copy,
  errors,
  fields,
  profile,
  password,
  initial,
}: {
  locale: Locale;
  copy: AccountContent["profile"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  profile: DonorProfile;
  password: AccountContent["password"];
  initial: AccountSettingsSection;
}) {
  return (
    <div>
      <h1 className="font-display text-heading">{copy.title}</h1>
      <p className="mt-lg max-w-measure text-body text-ink-muted">{copy.lead}</p>
      <AccountBlockFocus id={accountBlockId(initial)} />
      <div className="mt-2xl grid gap-3xl lg:grid-cols-2 lg:items-start">
        <div className="space-y-3xl">
          <PortraitPanel
            copy={copy}
            errors={errors}
            fields={fields}
            locale={locale}
            profile={profile}
          />
          <AppearancePanel
            copy={copy}
            errors={errors}
            fields={fields}
            locale={locale}
            profile={profile}
          />
        </div>
        <div className="space-y-3xl">
          <AccessPanel
            copy={copy}
            errors={errors}
            fields={fields}
            locale={locale}
            password={password}
          />
          <DeletePanel copy={copy} errors={errors} locale={locale} />
        </div>
      </div>
    </div>
  );
}
