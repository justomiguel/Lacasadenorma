"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import {
  compactPrimaryActionClass,
  HelpActionLabel,
  ICON_ACTION,
} from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import { MenuIcon } from "@/components/design-system/icons";
import type { UiContent } from "@/content/schema";
import { localizedHref } from "@/src/i18n/href";
import { stripLocalePrefix, type Locale } from "@/src/i18n/locale";
import { track } from "@/src/infrastructure/analytics/browser";

import { AccountChrome } from "./account-chrome";
import { SiteMark } from "./mark";
import { MobileMenu } from "./mobile-menu";
import { HEADER_NAV } from "./navigation";

const NAV_HREFS = HEADER_NAV.map((item) => item.href);

/**
 * Encabezado editorial (ADR-032, ADR-035): 60 px, el símbolo y el nombre a la
 * izquierda, el menú a la derecha, y nada más en teléfono. La cuenta
 * —ingresar o, con sesión, «Mi Panel»— y la acción de ayudar viven dentro
 * del menú (ADR-037). Salir también: en el encabezado recorta el nombre.
 * El idioma no: va en el pie, con banderas. La cuenta va arriba de las
 * secciones, porque debajo de las de display no se ve en un teléfono chico.
 *
 * En la home arranca transparente sobre la fotografía; al desplazarse gana un
 * fondo de papel con un desenfoque muy leve y una regla casi imperceptible. En
 * las páginas interiores es fijo desde el principio, sobre papel. En escritorio
 * las secciones van en línea, sin Cómo ayudar: Ingresar o Mi Panel como
 * botón de contorno y la acción de ayudar como primaria compacta.
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
  const helpHref = `${localizedHref("/ayudar", locale)}#donaciones`;
  const chromeLink =
    "inline-flex min-h-touch shrink-0 items-center whitespace-nowrap font-ui text-small text-current opacity-75 hover:opacity-100";
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
          className="inline-flex min-h-touch shrink-0 items-center gap-xs whitespace-nowrap font-display text-small font-medium uppercase tracking-label text-current"
        >
          <SiteMark />
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

        <div className="flex items-center gap-md lg:gap-lg">
          <AccountChrome
            locale={locale}
            ui={ui}
            variant="header"
            tone={transparent ? "paper" : "forest"}
            className={chromeLink}
          />

          {/* Escritorio: la acción como primaria compacta. */}
          {onHelpPage ? null : (
            <div className="hidden lg:block">
              <a
                href={helpHref}
                data-help-primary=""
                className={compactPrimaryActionClass(transparent ? "paper" : "forest")}
                {...(transparent ? { "data-tone": "paper" as const } : {})}
                onClick={() => {
                  track({ name: "ayudar_click", props: { origen: "encabezado" } });
                }}
              >
                <HelpActionLabel>{ui.helpCta}</HelpActionLabel>
              </a>
            </div>
          )}

          <button
            type="button"
            aria-label={ui.home.menu}
            aria-expanded={open}
            aria-controls={menuId}
            className={cn(
              ICON_ACTION,
              "-mr-sm text-current lg:hidden",
              transparent ? "hover:bg-forest-strong/40" : "",
            )}
            onClick={() => {
              setMenuFor(pathname);
            }}
          >
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
