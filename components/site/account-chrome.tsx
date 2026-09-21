"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { signOut } from "@/app/(es)/cuenta/actions";
import { ACCOUNT_SECTION_PARAM } from "@/components/account/account-section";
import { LocaleField } from "@/components/account/fields";
import {
  compactOutlineActionClass,
  type ActionTone,
} from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import {
  BoxIcon,
  ChartIcon,
  GridIcon,
  LeaveIcon,
  PersonIcon,
} from "@/components/design-system/icons";
import { PendingTextButton } from "@/components/design-system/pending-submit";
import { sidebarSignOutClass } from "@/components/design-system/work-sidebar";
import type { UiContent } from "@/content/schema";
import { localizedHref } from "@/src/i18n/href";
import { stripLocalePrefix, type Locale } from "@/src/i18n/locale";

import { ACCOUNT_HREF } from "./navigation";
import { useChromeSession } from "./session";

/**
 * Cómo se ve la cuenta en el chrome: ingresar, o «Mi Panel».
 *
 * En el encabezado, «Ingresar» y «Mi Panel» son el mismo botón de
 * contorno, sólo en escritorio. Salir no va ahí: recorta el nombre en
 * un teléfono. En el menú el bloque muestra retrato, nombre, correo y
 * las salidas —mis donaciones, la cuenta, el backoffice si hay rol,
 * métricas si es owner—. Cerrar sesión va al pie de ese menú, en rojo
 * (ADR-037). En el teléfono este bloque reemplaza al menú de trabajo.
 * El pie del sitio no muestra el backoffice: es un colofón.
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
  tone = "forest",
}: {
  locale: Locale;
  ui: UiContent;
  variant: "header" | "drawer" | "footer" | "sign-out";
  onNavigate?: () => void;
  className?: string;
  /** Superficie del encabezado: `paper` sobre la foto, `forest` sobre papel. */
  tone?: ActionTone;
}) {
  const { session, portraitSrc } = useChromeSession();
  const accountHref = localizedHref(ACCOUNT_HREF, locale);
  const canonical = stripLocalePrefix(usePathname());
  const onAccount =
    canonical === ACCOUNT_HREF || canonical.startsWith(`${ACCOUNT_HREF}/`);
  const onAdmin = canonical === "/admin" || canonical.startsWith("/admin/");
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

        <DrawerLink
          href={`${accountHref}?${ACCOUNT_SECTION_PARAM}=reservas`}
          icon={
            <IdentifyingMark>
              <BoxIcon />
            </IdentifyingMark>
          }
          {...(onNavigate === undefined ? {} : { onNavigate })}
        >
          {ui.pledges}
        </DrawerLink>

        <DrawerLink
          href={`${accountHref}?${ACCOUNT_SECTION_PARAM}=cuenta`}
          icon={
            <IdentifyingMark>
              <PersonIcon />
            </IdentifyingMark>
          }
          {...(onNavigate === undefined ? {} : { onNavigate })}
          {...(onAccount ? { current: true } : {})}
        >
          {ui.account}
        </DrawerLink>

        {session.staff ? (
          <DrawerLink
            href="/admin"
            icon={
              <IdentifyingMark>
                <GridIcon />
              </IdentifyingMark>
            }
            {...(onNavigate === undefined ? {} : { onNavigate })}
            {...(onAdmin ? { current: true } : {})}
          >
            {ui.backoffice}
          </DrawerLink>
        ) : null}

        {session.owner ? (
          <DrawerLink
            href="/admin/metricas"
            icon={
              <IdentifyingMark>
                <ChartIcon />
              </IdentifyingMark>
            }
            {...(onNavigate === undefined ? {} : { onNavigate })}
          >
            {ui.metrics}
          </DrawerLink>
        ) : null}
      </div>
    );
  }

  if (variant === "header" && signedIn) {
    return (
      <div className="hidden lg:block">
        <Link
          href={accountHref}
          className={compactOutlineActionClass(tone)}
          {...current}
        >
          <IdentifyingMark>
            <PersonIcon />
          </IdentifyingMark>
          {ui.myPanel}
        </Link>
      </div>
    );
  }

  if (variant === "sign-out") {
    if (!signedIn) {
      return null;
    }

    return (
      <SignOutLink
        locale={locale}
        label={ui.signOut}
        pendingLabel={ui.signingOut}
        className={sidebarSignOutClass()}
        icon={
          <IdentifyingMark>
            <LeaveIcon />
          </IdentifyingMark>
        }
      />
    );
  }

  if (variant === "footer" && signedIn) {
    return (
      <Link
        href={accountHref}
        className={className ?? chromeFallback}
        {...current}
        {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
      >
        {ui.myPanel}
      </Link>
    );
  }

  const unsignedClass =
    variant === "header"
      ? compactOutlineActionClass(tone)
      : (className ?? chromeFallback);

  const unsignedLink = (
    <Link
      href={accountHref}
      className={unsignedClass}
      {...current}
      {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
    >
      {variant === "header" ? (
        <IdentifyingMark>
          <PersonIcon />
        </IdentifyingMark>
      ) : null}
      {label}
    </Link>
  );

  if (variant === "header") {
    return <div className="hidden lg:block">{unsignedLink}</div>;
  }

  return unsignedLink;
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
