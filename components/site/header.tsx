"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { secondaryActionClass, ICON_ACTION } from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import { ArrowIcon, MenuIcon } from "@/components/design-system/icons";
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

import { MobileMenu } from "./mobile-menu";
import { ACCOUNT_HREF, PRIMARY_NAV } from "./navigation";

const NAV_HREFS = PRIMARY_NAV.map((item) => item.href);

/**
 * Encabezado editorial (ADR-032): 60 px, el nombre a la izquierda, el menú a la
 * derecha, y nada más en teléfono. El idioma, ingresar y la acción de ayudar
 * viven dentro del menú.
 *
 * En la home arranca transparente sobre la fotografía; al desplazarse gana un
 * fondo de papel con un desenfoque muy leve y una regla casi imperceptible. En
 * las páginas interiores es fijo desde el principio, sobre papel. En escritorio
 * las cinco secciones van en línea, con el idioma, ingresar y la acción como
 * texto.
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
  const onHelpPage = canonical === "/ayudar" || canonical.startsWith("/ayudar/");
  const onAccount =
    canonical === ACCOUNT_HREF || canonical.startsWith(`${ACCOUNT_HREF}/`);
  const other = otherLocale(locale);
  const switchHref = switchLocaleHref(pathname, other);
  const helpHref = `${localizedHref("/ayudar", locale)}#donaciones`;
  const accountHref = localizedHref(ACCOUNT_HREF, locale);
  const chromeLink =
    "inline-flex min-h-touch shrink-0 items-center font-ui text-small text-current opacity-75 hover:opacity-100";
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

  const transparent = overlay && !compact;
  const chrome = transparent
    ? "fixed inset-x-0 top-0 z-20 border-b border-transparent bg-transparent text-paper"
    : overlay
      ? "fixed inset-x-0 top-0 z-20 border-b border-rule bg-paper/92 text-ink backdrop-blur-chrome"
      : "sticky top-0 z-20 border-b border-rule bg-paper/92 text-ink backdrop-blur-chrome";

  return (
    <header
      className={`${chrome} transition-[background-color,border-color,color] duration-chrome ease-editorial`}
    >
      <div className="mx-auto flex h-header w-full max-w-page items-center justify-between gap-md px-5 sm:px-xl lg:px-4xl">
        <Link
          href={localizedHref("/", locale)}
          aria-label={siteName}
          className="inline-flex min-h-touch shrink-0 items-center whitespace-nowrap font-display text-small font-medium uppercase tracking-label text-current"
        >
          {siteName}
        </Link>

        <nav aria-label={ui.nav.primary} className="hidden lg:block">
          <ul className="flex items-center gap-lg xl:gap-xl">
            {NAV_HREFS.map((href) => {
              const actual = canonical === href;
              const item = ui.primaryNav[href];

              return (
                <li key={href}>
                  <Link
                    href={localizedHref(href, locale)}
                    {...(actual ? { "aria-current": "page" as const } : {})}
                    className={cn(
                      "inline-flex min-h-touch items-center whitespace-nowrap font-ui text-small text-current transition-opacity duration-fast",
                      actual
                        ? "underline decoration-current decoration-1 underline-offset-6"
                        : "opacity-75 hover:opacity-100",
                    )}
                  >
                    {item.shortLabel}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-lg">
          {/* Escritorio: el idioma, ingresar y la acción como texto. El `hidden`
              va en el envoltorio y no en cada enlace, porque `secondaryActionClass`
              ya trae `inline-flex` y las dos utilidades de display compiten. */}
          <div className="hidden items-center gap-lg lg:flex">
            <Link
              href={accountHref}
              {...(onAccount ? { "aria-current": "page" as const } : {})}
              className={chromeLink}
            >
              {ui.signIn}
            </Link>

            <Link
              href={switchHref}
              hrefLang={htmlLang(other)}
              lang={htmlLang(other)}
              className={chromeLink}
            >
              {ui.otherLanguageName}
            </Link>

            {/* En /ayudar la acción llevaría a donde ya se está. */}
            {onHelpPage ? null : (
              <a
                href={helpHref}
                data-help-primary=""
                className={cn(
                  secondaryActionClass("forest"),
                  "whitespace-nowrap text-small text-current hover:text-current",
                )}
                onClick={() => {
                  track({ name: "ayudar_click", props: { origen: "encabezado" } });
                }}
              >
                <span>{ui.helpCta}</span>
                <ArrowIcon />
              </a>
            )}
          </div>

          <button
            type="button"
            aria-label={ui.home.menu}
            aria-expanded={open}
            aria-controls={menuId}
            className={cn(
              ICON_ACTION,
              "-mr-sm w-auto gap-xs px-sm font-ui text-small font-medium text-current lg:hidden",
              transparent ? "hover:bg-forest-strong/40" : "",
            )}
            onClick={() => {
              setMenuFor(pathname);
            }}
          >
            <span aria-hidden="true">{ui.home.menuShort}</span>
            <MenuIcon size={22} />
          </button>
        </div>
      </div>

      {open ? (
        <MobileMenu
          id={menuId}
          locale={locale}
          siteName={siteName}
          ui={ui}
          canonical={canonical}
          switchHref={switchHref}
          helpHref={helpHref}
          closeRef={closeRef}
          onClose={() => {
            setMenuFor(null);
          }}
        />
      ) : null}
    </header>
  );
}
