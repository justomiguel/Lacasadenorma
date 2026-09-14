"use client";

import Image from "next/image";
import { useActionState, useEffect } from "react";

import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import { removePortrait, savePortrait } from "@/app/(es)/cuenta/portrait-actions";
import { useChromeSession } from "@/components/site/session";
import type { AccountContent } from "@/content/schema";
import type { DonorProfile } from "@/src/domain/entities/donor";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

import { fieldError, generalError } from "./error-text";
import { FileField, FormError, LocaleField, SubmitButton } from "./fields";

function optional(error: string | undefined): { error?: string } {
  return error === undefined ? {} : { error };
}

export function PortraitForm({
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
  const { refresh, portraitSrc } = useChromeSession();
  const [saveState, saveAction] = useActionState<AccountFormState, FormData>(
    savePortrait,
    IDLE,
  );
  const [removeState, removeAction] = useActionState<AccountFormState, FormData>(
    removePortrait,
    IDLE,
  );
  const general = generalError(saveState, errors) ?? generalError(removeState, errors);
  const src =
    portraitSrc ??
    (profile.portraitPath === null ? null : localizedHref("/cuenta/retrato", locale));

  useEffect(() => {
    if (saveState.phase === "done" || removeState.phase === "done") {
      refresh();
    }
  }, [refresh, removeState.phase, saveState.phase]);

  return (
    <div className="max-w-measure space-y-lg">
      <div className="flex items-center gap-md">
        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-sm bg-sage/30">
          {src === null ? (
            <span className="sr-only">{fields.portraitEmpty}</span>
          ) : (
            <Image
              src={src}
              alt={profile.displayName ?? fields.portrait}
              width={56}
              height={64}
              unoptimized
              className="h-16 w-14 object-cover object-top"
            />
          )}
        </div>
        <p className="max-w-measure font-ui text-small text-ink-muted">
          {src === null ? fields.portraitEmpty : copy.portraitLead}
        </p>
      </div>

      <form action={saveAction} className="space-y-lg">
        <LocaleField locale={locale} />
        <FileField
          name="foto"
          label={src === null ? copy.portraitAdd : copy.portraitChange}
          hint={fields.portraitHint}
          accept="image/jpeg,image/png,image/webp"
          {...optional(fieldError(saveState, errors, "portrait"))}
        />
        {general === null ? null : <FormError>{general}</FormError>}
        <SubmitButton pendingLabel={copy.saving}>
          {src === null ? copy.portraitAdd : copy.portraitChange}
        </SubmitButton>
      </form>

      {src === null ? null : (
        <form action={removeAction}>
          <LocaleField locale={locale} />
          <button
            type="submit"
            className="min-h-touch font-ui text-small text-forest underline decoration-1 underline-offset-2 hover:text-forest-strong"
          >
            {copy.portraitRemove}
          </button>
        </form>
      )}
    </div>
  );
}
