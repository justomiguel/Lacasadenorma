"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import type { UiContent } from "@/content/schema";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import {
  htmlLang,
  otherLocale,
  stripLocalePrefix,
  switchLocaleHref,
} from "@/src/i18n/locale";
import { track } from "@/src/infrastructure/analytics/browser";

import { PRIMARY_NAV } from "./navigation";

const NAV_HREFS = PRIMARY_NAV.map((item) => item.href);

/**
 * Encabezado del mockup: logo a la izquierda, enlaces, CTA píldora.
 * En la home es fijo y transparente sobre el hero; al scrollear gana fondo
 * bosque con un desenfoque muy leve. En teléfono, hamburguesa y panel a
 * pantalla completa.
 */
export function SiteHeader({
  locale,
  siteName,
  ui,
}: {
  locale: Locale;
  siteName: string;
  ui: UiContent;
}) {
  const pathname = usePathname();
  const canonical = stripLocalePrefix(pathname);
  const overlay = canonical === "/";
  const other = otherLocale(locale);
  const switchHref = switchLocaleHref(pathname, other);
  const helpHref = `${localizedHref("/ayudar", locale)}#donaciones`;
  const menuId = useId();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = menuFor === pathname;

  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 24);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuFor(null);
      }
    }

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const chrome = overlay
    ? compact
      ? "fixed inset-x-0 top-0 z-20 bg-forest/88 text-paper backdrop-blur-[8px]"
      : "fixed inset-x-0 top-0 z-20 bg-transparent text-paper"
    : "sticky top-0 z-20 bg-forest text-paper";

  return (
    <header
      className={`${chrome} transition-[background-color,backdrop-filter] duration-[240ms] ease-editorial`}
    >
      <div
        className={
          compact
            ? "mx-auto flex w-full max-w-page items-center justify-between gap-md px-5 py-sm transition-[padding] duration-[240ms] ease-editorial sm:px-xl lg:px-4xl"
            : "mx-auto flex w-full max-w-page items-center justify-between gap-md px-5 py-md transition-[padding] duration-[240ms] ease-editorial sm:px-xl lg:px-4xl"
        }
      >
        <Link
          href={localizedHref("/", locale)}
          aria-label={siteName}
          className="lift-hover shrink-0 font-display text-small font-medium leading-tight tracking-tight text-paper"
        >
          <span className="block uppercase tracking-label">La Casa</span>
          <span className="block text-[0.7em] uppercase tracking-label">de Norma</span>
        </Link>

        <nav aria-label={ui.nav.primary} className="hidden lg:block">
          <ul className="flex items-center gap-lg">
            {NAV_HREFS.map((href) => {
              const actual = canonical === href;
              const item = ui.primaryNav[href];

              return (
                <li key={href}>
                  <Link
                    href={localizedHref(href, locale)}
                    {...(actual ? { "aria-current": "page" as const } : {})}
                    className={
                      actual
                        ? "inline-flex min-h-touch items-center font-ui text-small text-paper underline decoration-sage decoration-2 underline-offset-4"
                        : "inline-flex min-h-touch items-center font-ui text-small text-paper/80 transition-colors duration-fast hover:text-paper"
                    }
                  >
                    {item.shortLabel}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-sm">
          <Link
            href={switchHref}
            hrefLang={htmlLang(other)}
            lang={htmlLang(other)}
            className="inline-flex min-h-touch shrink-0 items-center font-ui text-small text-paper/80 underline decoration-1 underline-offset-4 hover:text-paper"
          >
            {ui.otherLanguageName}
          </Link>

          <Link
            href={helpHref}
            data-help-primary=""
            className="lift-hover hidden min-h-touch items-center rounded-pill bg-sage px-lg font-ui text-small font-medium text-forest sm:inline-flex"
            onClick={() => {
              track({ name: "ayudar_click", props: { origen: "encabezado" } });
            }}
          >
            {ui.helpCta} →
          </Link>

          <button
            type="button"
            className="inline-flex min-h-touch min-w-touch items-center justify-center lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => {
              setMenuFor(pathname);
            }}
          >
            <span className="sr-only">{ui.home.menu}</span>
            <span aria-hidden="true" className="flex flex-col gap-3xs">
              <span className="block h-[2px] w-6 bg-paper" />
              <span className="block h-[2px] w-6 bg-paper" />
              <span className="block h-[2px] w-6 bg-paper" />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-label={ui.nav.primary}
          data-menu-panel=""
          className="fixed inset-0 z-30 flex flex-col bg-forest px-5 py-md text-paper"
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-small uppercase tracking-label">
              La Casa de Norma
            </p>
            <button
              ref={closeRef}
              type="button"
              className="inline-flex min-h-touch min-w-touch items-center justify-center font-ui text-small"
              onClick={() => {
                setMenuFor(null);
              }}
            >
              {ui.home.closeMenu}
            </button>
          </div>

          <ul className="mt-3xl flex flex-col gap-lg">
            {NAV_HREFS.map((href) => {
              const actual = canonical === href;
              const item = ui.primaryNav[href];

              return (
                <li key={href}>
                  <Link
                    href={localizedHref(href, locale)}
                    {...(actual ? { "aria-current": "page" as const } : {})}
                    className="font-display text-title"
                    onClick={() => {
                      setMenuFor(null);
                    }}
                  >
                    {item.shortLabel}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href={helpHref}
            data-help-primary=""
            className="lift-hover mt-3xl inline-flex min-h-touch w-fit items-center rounded-pill bg-sage px-xl py-sm font-ui text-subheading font-medium text-forest"
            onClick={() => {
              setMenuFor(null);
              track({ name: "ayudar_click", props: { origen: "menu" } });
            }}
          >
            {ui.helpCta} →
          </Link>
        </div>
      ) : null}
    </header>
  );
}
