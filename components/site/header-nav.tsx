"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { UiContent } from "@/content/schema";
import type { Route } from "next";

import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { otherLocale, stripLocalePrefix, switchLocaleHref } from "@/src/i18n/locale";

const NAV = [
  "/norma",
  "/que-paso",
  "/reconstruccion",
  "/ayudar",
  "/transparencia",
  "/novedades",
] as const;

/**
 * Los enlaces del encabezado que necesitan saber en qué página estamos.
 *
 * Marcar la página actual con `aria-current` requiere la ruta, y en Next 16 la
 * ruta sólo se puede leer en el navegador. Así que hay JavaScript de cliente acá
 * y nada más que acá: el encabezado sigue siendo un componente de servidor.
 *
 * Esa frontera importa por peso, no por elegancia. Cuando `"use client"` estaba
 * en el encabezado, el archivo importaba `site` desde `@/content`, y con eso
 * cruzaban al navegador los diez JSON de contenido y Zod entero: 408 KB sin
 * comprimir, casi 100 KB comprimidos, arriba del presupuesto de scripts. Este
 * archivo recibe las etiquetas por props —un objeto de cadenas— y
 * `next/navigation`, que `Link` ya traía.
 *
 * Devuelve hermanos y no un contenedor: son hijos del flex del encabezado, con
 * el nombre del sitio empujándolos a la derecha.
 *
 * `aria-current` compara la ruta **canónica** (sin `/en`). Así `/en/norma` marca
 * Norma igual que `/norma`.
 */
export function HeaderNav({
  locale,
  labels,
  primaryLabel,
  helpLabel,
  helpHref,
  languageSwitcher,
}: {
  locale: Locale;
  labels: UiContent["primaryNav"];
  primaryLabel: string;
  helpLabel: string;
  helpHref: ReturnType<typeof localizedHref>;
  languageSwitcher: {
    label: string;
    hrefLang: string;
    lang: string;
  };
}) {
  const pathname = usePathname();
  const canonical = stripLocalePrefix(pathname);
  const switchHref = switchLocaleHref(pathname, otherLocale(locale));
  const helpIsCurrent = canonical === "/ayudar";

  return (
    <>
      <nav aria-label={primaryLabel} className="hidden lg:block">
        <ul className="flex items-baseline gap-lg">
          {/* Sin `/ayudar`: es la acción de la derecha, y tenerla también en la lista
              ponía dos enlaces al mismo destino en la misma línea. El pie y el
              sumario sí la listan, porque ahí no hay acción con la que se duplique. */}
          {NAV.filter((href) => href !== "/ayudar").map((href) => {
            const actual = canonical === href;
            const item = labels[href];

            return (
              <li key={href}>
                <Link
                  href={localizedHref(href, locale)}
                  {...(actual ? { "aria-current": "page" as const } : {})}
                  className={
                    actual
                      ? "inline-flex min-h-touch items-center font-ui text-small text-ink underline decoration-brick decoration-2 underline-offset-4"
                      : "inline-flex min-h-touch items-center font-ui text-small text-ink-muted transition-colors duration-fast hover:text-ink"
                  }
                >
                  {item.shortLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Link
        href={switchHref as Route}
        hrefLang={languageSwitcher.hrefLang}
        lang={languageSwitcher.lang}
        className="inline-flex min-h-touch shrink-0 items-center font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-ink"
      >
        {languageSwitcher.label}
      </Link>

      {/* La acción también se marca cuando es la página abierta. Es la única ruta
          primaria que no está en la lista de arriba, y si no se marcara acá sería
          la única del sitio donde el lector de pantalla no sabe dónde está. */}
      <Link
        href={helpHref}
        {...(helpIsCurrent ? { "aria-current": "page" as const } : {})}
        className="inline-flex min-h-touch shrink-0 items-center font-ui text-small font-medium text-brick underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-brick-strong"
      >
        {helpLabel}
      </Link>
    </>
  );
}
