"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/design-system/cn";

import type { AdminSection } from "./nav";

/** `/admin/novedades/id` sigue marcando Novedades; `/admin` no marca a nadie. */
export function sectionIsCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ sections }: { sections: readonly AdminSection[] }) {
  const pathname = usePathname();

  if (sections.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Secciones del backoffice" className="border-t border-rule">
      {/*
       * Desplazamiento horizontal en el teléfono en lugar de un menú
       * desplegable: las secciones entran en dos gestos, y un menú agrega un
       * toque a cada navegación de un trabajo que se hace muchas veces por día.
       */}
      <ul className="mx-auto flex max-w-page gap-lg overflow-x-auto px-md py-xs sm:px-lg">
        {sections.map((section) => {
          const current = sectionIsCurrent(pathname, section.href);

          return (
            <li key={section.href}>
              <Link
                href={section.href}
                {...(current ? { "aria-current": "page" as const } : {})}
                className={cn(
                  "inline-flex min-h-touch items-center whitespace-nowrap font-ui text-small transition-colors duration-fast",
                  current
                    ? "font-medium text-ink underline decoration-forest decoration-1 underline-offset-6"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
