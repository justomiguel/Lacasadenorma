"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LocaleFlag } from "@/components/design-system/flags";
import type { UiContent } from "@/content/schema";
import { htmlLang, LOCALES, switchLocaleHref, type Locale } from "@/src/i18n/locale";

/**
 * Conmutador de idioma del pie.
 *
 * Las dos variedades publicadas, cada una con su bandera antes del nombre
 * (ADR-047). El actual no es un enlace: ya estás ahí. El otro lleva
 * `hrefLang` y `lang` del destino, que es el idioma de esa palabra.
 */
export function LanguageSwitch({
  locale,
  ui,
  className,
}: {
  locale: Locale;
  ui: UiContent;
  className?: string;
}) {
  const pathname = usePathname();
  const names: Record<Locale, string> = {
    es: locale === "es" ? ui.languageName : ui.otherLanguageName,
    en: locale === "en" ? ui.languageName : ui.otherLanguageName,
  };

  return (
    <nav aria-label={ui.nav.language} className={className}>
      <ul className="flex flex-wrap gap-x-lg">
        {LOCALES.map((id) => {
          const label = names[id];
          const mark = (
            <>
              <LocaleFlag locale={id} />
              {label}
            </>
          );

          if (id === locale) {
            return (
              <li key={id}>
                <span
                  aria-current="true"
                  lang={htmlLang(id)}
                  className="inline-flex min-h-touch items-center gap-xs font-ui text-small text-ink"
                >
                  {mark}
                </span>
              </li>
            );
          }

          return (
            <li key={id}>
              <Link
                href={switchLocaleHref(pathname, id)}
                hrefLang={htmlLang(id)}
                lang={htmlLang(id)}
                className="inline-flex min-h-touch items-center gap-xs font-ui text-small text-ink-muted transition-colors duration-fast hover:text-ink"
              >
                {mark}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
