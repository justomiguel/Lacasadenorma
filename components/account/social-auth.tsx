"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { startOAuth } from "@/app/(es)/cuenta/oauth-actions";
import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import { BrandMark } from "@/components/design-system/brand-mark";
import { cn } from "@/components/design-system/cn";
import { BRANDS, type BrandId } from "@/content/brands";
import type { AccountContent } from "@/content/schema";
import type { SocialProviderId } from "@/src/domain/auth/social-providers";
import type { Locale } from "@/src/i18n/locale";

import { generalError } from "./error-text";
import { FormError, LocaleField } from "./fields";

/**
 * El puente entre el id del catálogo y la marca que se pinta.
 *
 * Las claves van entre comillas a propósito: `check:marcas` busca el id
 * literal al lado de `BrandMark`. Un `google:` sin comillas no cuenta.
 */
const SOCIAL_BRAND = {
  google: "google",
  apple: "apple",
  facebook: "facebook",
  x: "x",
  github: "github",
  gitlab: "gitlab",
  linkedin: "linkedin",
  discord: "discord",
  twitch: "twitch",
  spotify: "spotify",
} as const satisfies Record<SocialProviderId, BrandId>;

/**
 * Las redes habilitadas, debajo del formulario de correo.
 *
 * No son una segunda primaria ni píldoras. El alta por correo sigue siendo la
 * acción de la pantalla; esto es la alternativa, con el logo al lado del
 * nombre. Si la lista viene vacía, no se pinta nada: un control que no hace
 * nada es peor que no estar (ADR-038).
 */
export function SocialAuth({
  copy,
  errors,
  locale,
  providers,
  returnTo,
}: {
  copy: AccountContent["social"];
  errors: AccountContent["errors"];
  locale: Locale;
  providers: readonly SocialProviderId[];
  returnTo?: string | null;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    startOAuth,
    IDLE,
  );

  if (providers.length === 0) {
    return null;
  }

  const general = generalError(state, errors);

  return (
    <div className="max-w-measure">
      <p className="mt-xl flex items-center gap-sm font-ui text-caption text-ink-muted">
        <span className="h-px flex-1 bg-rule" aria-hidden={true} />
        {copy.or}
        <span className="h-px flex-1 bg-rule" aria-hidden={true} />
      </p>

      <form action={formAction} className="mt-lg space-y-sm">
        <LocaleField locale={locale} />
        {returnTo === null || returnTo === undefined || returnTo.length === 0 ? null : (
          <input type="hidden" name="volver" value={returnTo} />
        )}

        {general === null ? null : <FormError>{general}</FormError>}

        {providers.map((id) => {
          const brand = SOCIAL_BRAND[id];

          return (
            <SocialSubmit
              key={id}
              brand={brand}
              pendingLabel={copy.continuing}
              provider={id}
            >
              {copy.continueWith.replace("{name}", BRANDS[brand].name)}
            </SocialSubmit>
          );
        })}
      </form>
    </div>
  );
}

function SocialSubmit({
  brand,
  children,
  pendingLabel,
  provider,
}: {
  brand: BrandId;
  children: string;
  pendingLabel: string;
  provider: SocialProviderId;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="proveedor"
      value={provider}
      disabled={pending}
      className={cn(
        "inline-flex min-h-cta w-full items-center justify-center gap-xs rounded-md border border-rule px-lg",
        "font-ui text-body font-medium text-ink",
        "transition-colors duration-fast ease-editorial",
        "hover:bg-paper-sunk disabled:opacity-60",
      )}
    >
      <BrandMark id={brand} />
      {pending ? pendingLabel : children}
    </button>
  );
}
