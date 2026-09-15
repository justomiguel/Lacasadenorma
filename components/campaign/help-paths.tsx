import { SecondaryAction } from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import type { UiContent } from "@/content/schema";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

const PATHS = [
  {
    title: "pathHands",
    lead: "pathHandsLead",
    action: "pathHandsCta",
    href: "/contacto",
  },
  {
    title: "pathMoney",
    lead: "pathMoneyLead",
    action: "pathMoneyCta",
    href: "/ayudar/dinero",
  },
  {
    title: "pathArticles",
    lead: "pathArticlesLead",
    action: "pathArticlesCta",
    href: "/catalogo",
  },
] as const;

/**
 * Los tres caminos para ayudar, a la vista (ADR-045).
 *
 * No son pestañas ni tarjetas: una lista con regla entre cada camino, título,
 * una línea y una secundaria. Quien llega ve ir, donar plata y traer lo que
 * falta sin tener que descubrir una pestaña.
 *
 * Es un Server Component: son enlaces. Sin JavaScript se lee igual.
 */
export function HelpPaths({
  locale,
  ui,
  heading: Heading = "h2",
  className,
}: {
  locale: Locale;
  ui: UiContent;
  heading?: "h2" | "h3";
  className?: string;
}) {
  return (
    <nav aria-label={ui.home.helpPathsLabel} className={cn("max-w-measure", className)}>
      <ul>
        {PATHS.map((path, index) => (
          <li
            key={path.href}
            className={index === 0 ? undefined : "mt-xl border-t border-rule pt-xl"}
          >
            <Heading className="font-display text-section-title">
              {ui.home[path.title]}
            </Heading>
            <p className="mt-sm text-body text-ink-muted">{ui.home[path.lead]}</p>
            <SecondaryAction href={localizedHref(path.href, locale)} className="mt-lg">
              {ui.home[path.action]}
            </SecondaryAction>
          </li>
        ))}
      </ul>
    </nav>
  );
}
