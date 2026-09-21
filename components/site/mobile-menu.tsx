"use client";

import Link from "next/link";
import type { CSSProperties, RefObject } from "react";

import {
  HelpActionLabel,
  ICON_ACTION,
  primaryActionClass,
} from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import { CloseIcon } from "@/components/design-system/icons";
import type { UiContent } from "@/content/schema";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { track } from "@/src/infrastructure/analytics/browser";

import { AccountChrome } from "./account-chrome";
import { SiteMark } from "./mark";
import { HEADER_NAV, SECONDARY_NAV } from "./navigation";

/**
 * El menú del teléfono, a pantalla completa (ADR-032).
 *
 * Es corto a propósito: la cuenta —y Backoffice, si hay rol, y Métricas si es
 * owner— primero, para que no queden debajo de las secciones en un
 * teléfono chico; después las
 * secciones en la serif de display (sin Cómo ayudar: ya está el CTA), los
 * enlaces chicos y la acción de ayudar.
 * El idioma está en el pie. Respeta las áreas seguras del teléfono con
 * `safe-top` y `safe-bottom`.
 * Cada ítem entra con un escalón de 40 ms; con `prefers-reduced-motion` no se
 * mueve nada.
 */
export function MobileMenu({
  id,
  locale,
  siteName,
  ui,
  canonical,
  helpHref,
  closeRef,
  onClose,
}: {
  id: string;
  locale: Locale;
  siteName: string;
  ui: UiContent;
  canonical: string;
  helpHref: string;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={ui.nav.primary}
      data-menu-panel=""
      data-tone="forest"
      className="fixed inset-0 z-30 flex h-dvh w-screen flex-col overflow-y-auto bg-forest px-5 text-paper safe-bottom safe-top"
    >
      <div className="flex h-header items-center justify-between">
        <p className="inline-flex items-center gap-xs font-display text-small uppercase tracking-label">
          <SiteMark />
          {siteName}
        </p>
        <button
          ref={closeRef}
          type="button"
          aria-label={ui.home.closeMenu}
          className={cn(ICON_ACTION, "-mr-sm text-paper hover:bg-forest-strong")}
          onClick={onClose}
        >
          <CloseIcon size={24} />
        </button>
      </div>

      {/*
       * La cuenta va primero: en 360×640 las secciones de display
       * llenan la pantalla, y Backoffice / Ingresar debajo no se veían.
       */}
      <div
        data-menu-item=""
        style={{ "--menu-index": 0 } as CSSProperties}
        className="mt-lg border-b border-paper/15 pb-lg"
      >
        <AccountChrome
          locale={locale}
          ui={ui}
          variant="drawer"
          className="text-paper-muted"
          onNavigate={onClose}
        />
      </div>

      <nav aria-label={ui.nav.primary} className="mt-xl flex-1">
        <ul className="flex flex-col">
          {HEADER_NAV.map((item, index) => {
            const actual = canonical === item.href;

            return (
              <li
                key={item.href}
                data-menu-item=""
                style={{ "--menu-index": index + 1 } as CSSProperties}
              >
                <Link
                  href={localizedHref(item.href, locale)}
                  {...(actual ? { "aria-current": "page" as const } : {})}
                  className={cn(
                    "flex min-h-touch items-center py-sm font-display text-title",
                    actual ? "text-sage" : "",
                  )}
                  onClick={onClose}
                >
                  {ui.primaryNav[item.href].shortLabel}
                </Link>
              </li>
            );
          })}
        </ul>

        <ul
          data-menu-item=""
          style={{ "--menu-index": HEADER_NAV.length + 1 } as CSSProperties}
          className="mt-lg flex flex-wrap gap-x-lg"
        >
          {SECONDARY_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={localizedHref(item.href, locale)}
                className="inline-flex min-h-touch items-center font-ui text-small text-paper-muted"
                onClick={onClose}
              >
                {ui.secondaryNav[item.href].label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div
        data-menu-item=""
        style={{ "--menu-index": HEADER_NAV.length + 2 } as CSSProperties}
        className="mt-xl flex flex-col gap-md pb-md"
      >
        <AccountChrome locale={locale} ui={ui} variant="sign-out" />
        <a
          href={helpHref}
          data-help-primary=""
          data-tone="paper"
          className={primaryActionClass("paper", "sm:w-full")}
          onClick={() => {
            onClose();
            track({ name: "ayudar_click", props: { origen: "menu" } });
          }}
        >
          <HelpActionLabel>{ui.helpCta}</HelpActionLabel>
        </a>
      </div>
    </div>
  );
}
