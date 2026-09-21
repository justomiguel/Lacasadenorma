"use client";

import Image from "next/image";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import { removePortrait, savePortrait } from "@/app/(es)/cuenta/portrait-actions";
import { CameraIcon } from "@/components/design-system/icons";
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
      <form action={saveAction} className="space-y-lg">
        <div className="flex items-center gap-md">
          <PortraitSlot
            src={src}
            name={profile.displayName}
            emptyLabel={fields.portraitEmpty}
            altFallback={fields.portrait}
          />
          <p className="max-w-measure font-ui text-small text-ink-muted">
            {src === null ? fields.portraitEmpty : copy.portraitLead}
          </p>
        </div>
        <LocaleField locale={locale} />
        <FileField
          name="foto"
          label={src === null ? copy.portraitAdd : copy.portraitChange}
          hint={fields.portraitHint}
          accept="image/jpeg,image/png,image/webp"
          pendingLabel={copy.saving}
          {...optional(fieldError(saveState, errors, "portrait"))}
        />
        {general === null ? null : <FormError>{general}</FormError>}
        <SubmitButton icon={<CameraIcon />} pendingLabel={copy.saving}>
          {src === null ? copy.portraitAdd : copy.portraitChange}
        </SubmitButton>
      </form>

      {src === null ? null : (
        <form action={removeAction}>
          <LocaleField locale={locale} />
          <RemovePortraitButton
            label={copy.portraitRemove}
            pendingLabel={copy.portraitRemoving}
          />
        </form>
      )}
    </div>
  );
}

function PortraitSlot({
  src,
  name,
  emptyLabel,
  altFallback,
}: {
  src: string | null;
  name: string | null;
  emptyLabel: string;
  altFallback: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div
      className="relative h-16 w-14 shrink-0 overflow-hidden rounded-sm bg-sage/30"
      aria-busy={pending || undefined}
    >
      {src === null ? (
        <span className="sr-only">{emptyLabel}</span>
      ) : (
        <Image
          src={src}
          alt={name ?? altFallback}
          width={56}
          height={64}
          unoptimized
          data-busy-preview={pending ? "" : undefined}
          className="h-16 w-14 object-cover object-top"
        />
      )}
    </div>
  );
}

function RemovePortraitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="min-h-touch font-ui text-small text-forest underline decoration-1 underline-offset-2 hover:text-forest-strong disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
