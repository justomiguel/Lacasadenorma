"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { signOut } from "@/app/(es)/cuenta/actions";
import { LocaleField } from "@/components/account/fields";
import { cn } from "@/components/design-system/cn";
import {
  ChartIcon,
  GridIcon,
  LeaveIcon,
  PersonIcon,
} from "@/components/design-system/icons";
import { PendingTextButton } from "@/components/design-system/pending-submit";
import type { UiContent } from "@/content/schema";
import { localizedHref } from "@/src/i18n/href";
import { stripLocalePrefix, type Locale } from "@/src/i18n/locale";

import { ACCOUNT_HREF } from "./navigation";
import { useChromeSession } from "./session";

/**
 * Cómo se ve la cuenta en el chrome: ingresar, o nombre + retrato + salir.
 *
 * En el encabezado de escritorio es texto, como «Ingresar». Si hay rol, el
 * tercer enlace recortaba la acción de ayudar, así que «Cerrar sesión» se queda
 * en el menú y en `/cuenta`. En el teléfono es un bloque: retrato rectangular
 * (no un avatar redondo), nombre, correo y las salidas —la cuenta, el
 * backoffice si hay rol, métricas si es owner, y cerrar sesión—, cada una con
 * un icono de trazo para barrer (ADR-037). En el menú ese bloque va arriba de
 * las secciones: las cinco de display llenan 360×640 y lo que queda debajo no
 * se ve (ADR-032, ADR-037). El pie no muestra el backoffice: es un colofón.
 */

const chromeFallback = "inline-flex min-h-touch w-fit items-center font-ui text-small";
const DRAWER_ITEM =
  "inline-flex min-h-touch w-fit items-center gap-sm font-ui text-small text-paper-muted";

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
  const onAdmin = canonical === "/admin" || canonical.startsWith("/admin/");
  const current = onAccount ? { "aria-current": "page" as const } : {};
  // El backoffice ya tiene su propia salida. Mostrar otra acá duplicaba el
  // botón y, peor, la pública manda a `/cuenta/ingresar` en lugar de a
  // `/admin/login`.
  const signedIn = session.status === "signed-in" && !onAdmin;
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

        <DrawerLink
          href={accountHref}
          icon={<PersonIcon />}
          onNavigate={onNavigate}
          current={onAccount}
        >
          {ui.account}
        </DrawerLink>

        {session.staff ? (
          <DrawerLink href="/admin" icon={<GridIcon />} onNavigate={onNavigate}>
            {ui.backoffice}
          </DrawerLink>
        ) : null}

        {session.owner ? (
          <DrawerLink href="/admin/metricas" icon={<ChartIcon />} onNavigate={onNavigate}>
            {ui.metrics}
          </DrawerLink>
        ) : null}

        <SignOutLink
          locale={locale}
          label={ui.signOut}
          pendingLabel={ui.signingOut}
          className={DRAWER_ITEM}
          icon={<LeaveIcon />}
        />
      </div>
    );
  }

  if (variant === "header" && signedIn) {
    return (
      <div className="flex items-center gap-lg">
        {session.staff ? (
          <Link href="/admin" className={className ?? chromeFallback}>
            {ui.backoffice}
          </Link>
        ) : null}
        <Link href={accountHref} className={className ?? chromeFallback} {...current}>
          {label}
        </Link>
        {session.staff ? null : (
          <SignOutLink
            locale={locale}
            label={ui.signOut}
            pendingLabel={ui.signingOut}
            className={className ?? chromeFallback}
          />
        )}
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

function DrawerLink({
  href,
  icon,
  children,
  onNavigate,
  current = false,
}: {
  href: string;
  icon: ReactNode;
  children: string;
  onNavigate?: () => void;
  current?: boolean;
}) {
  return (
    <Link
      href={href}
      className={DRAWER_ITEM}
      {...(current ? { "aria-current": "page" as const } : {})}
      {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
    >
      {icon}
      {children}
    </Link>
  );
}

function SignOutLink({
  locale,
  label,
  pendingLabel,
  className,
  icon,
}: {
  locale: Locale;
  label: string;
  pendingLabel: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <form action={signOut} className="m-0 shrink-0">
      <LocaleField locale={locale} />
      <PendingTextButton
        pendingLabel={pendingLabel}
        className={className ?? chromeFallback}
        {...(icon === undefined ? {} : { icon })}
      >
        {label}
      </PendingTextButton>
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
