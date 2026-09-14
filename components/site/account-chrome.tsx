"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/(es)/cuenta/actions";
import { LocaleField } from "@/components/account/fields";
import { cn } from "@/components/design-system/cn";
import type { UiContent } from "@/content/schema";
import { localizedHref } from "@/src/i18n/href";
import { stripLocalePrefix, type Locale } from "@/src/i18n/locale";

import { ACCOUNT_HREF } from "./navigation";
import { useChromeSession } from "./session";

/**
 * Cómo se ve la cuenta en el chrome: ingresar, o nombre + retrato + salir.
 *
 * En el encabezado de escritorio es texto, como «Ingresar». En el menú del
 * teléfono es un bloque: retrato rectangular (no un avatar redondo), nombre,
 * correo y las dos salidas —la cuenta y cerrar sesión— (ADR-032, ADR-037).
 */

const LINK =
  "inline-flex min-h-touch w-fit items-center font-ui text-small underline decoration-1 underline-offset-4";
const chromeFallback = "inline-flex min-h-touch w-fit items-center font-ui text-small";

export function AccountChrome({
  locale,
  ui,
  variant,
  onNavigate,
  className,
}: {
  locale: Locale;
  ui: UiContent;
  variant: "header" | "drawer" | "footer";
  onNavigate?: () => void;
  className?: string;
}) {
  const { session, portraitSrc } = useChromeSession();
  const accountHref = localizedHref(ACCOUNT_HREF, locale);
  const canonical = stripLocalePrefix(usePathname());
  const onAccount =
    canonical === ACCOUNT_HREF || canonical.startsWith(`${ACCOUNT_HREF}/`);
  const current = onAccount ? { "aria-current": "page" as const } : {};
  const signedIn = session.status === "signed-in";
  const label = signedIn ? (session.displayName ?? ui.account) : ui.signIn;

  if (variant === "drawer" && signedIn) {
    return (
      <div className={cn("flex flex-col gap-md", className)}>
        <div className="flex items-center gap-md">
          <PortraitSlot
            src={portraitSrc}
            name={session.displayName}
            emptyLabel={ui.account}
            onForest
          />
          <div className="min-w-0">
            <p className="truncate font-ui text-body font-medium text-paper">{label}</p>
            {session.email === null ? null : (
              <p className="mt-3xs truncate font-ui text-small text-paper-muted">
                {session.email}
              </p>
            )}
          </div>
        </div>

        <Link
          href={accountHref}
          className={cn(LINK, "text-paper-muted")}
          {...current}
          {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
        >
          {ui.account}
        </Link>

        <SignOutLink
          locale={locale}
          label={ui.signOut}
          className={cn(LINK, "text-paper-muted")}
        />
      </div>
    );
  }

  if (variant === "header" && signedIn) {
    return (
      <div className="flex items-center gap-lg">
        <Link href={accountHref} className={className ?? chromeFallback} {...current}>
          {label}
        </Link>
        <SignOutLink
          locale={locale}
          label={ui.signOut}
          className={className ?? chromeFallback}
        />
      </div>
    );
  }

  return (
    <Link
      href={accountHref}
      className={className ?? chromeFallback}
      {...current}
      {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
    >
      {label}
    </Link>
  );
}

function SignOutLink({
  locale,
  label,
  className,
}: {
  locale: Locale;
  label: string;
  className?: string;
}) {
  return (
    <form action={signOut}>
      <LocaleField locale={locale} />
      <button type="submit" className={className ?? chromeFallback}>
        {label}
      </button>
    </form>
  );
}

function PortraitSlot({
  src,
  name,
  emptyLabel,
  onForest,
}: {
  src: string | null;
  name: string | null;
  emptyLabel: string;
  onForest: boolean;
}) {
  const alt = name === null ? emptyLabel : name;

  return (
    <div
      className={cn(
        "relative h-16 w-14 shrink-0 overflow-hidden rounded-sm",
        onForest ? "bg-paper/15" : "bg-sage/30",
      )}
    >
      {src === null ? (
        <span className="sr-only">{emptyLabel}</span>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={56}
          height={64}
          unoptimized
          className="h-16 w-14 object-cover object-top"
        />
      )}
    </div>
  );
}
