import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { CoverImage } from "@/src/domain/entities";
import type { Locale } from "@/src/i18n/locale";

import { ArrowIcon } from "./icons";
import { Byline } from "./typography";
import { cn } from "./cn";

/**
 * Índice de novedades: de la más nueva a la más vieja, fecha, título, recorte.
 *
 * No es una grilla de tarjetas. Cada entrada es una fila separada por la regla,
 * con la foto —si hay— en la columna angosta. Es un sumario de revista y se lee
 * igual en un teléfono (ADR-034).
 */
export function NewsFeed({ children }: { children: ReactNode }) {
  return <ol className="divide-y divide-rule">{children}</ol>;
}

export function NewsFeedItem({
  href,
  title,
  date,
  summary,
  action,
  photo,
  locale,
  lang,
  prefetch,
}: {
  href: string;
  title: string;
  date: string | null;
  summary: string;
  action: string;
  photo: CoverImage | null;
  locale: Locale;
  lang?: string;
  prefetch?: boolean;
}) {
  return (
    <li className="py-xl first:pt-0">
      <Link
        href={href}
        className="arrow-link group flex flex-row items-start gap-md text-ink no-underline sm:gap-xl"
        {...(prefetch === undefined ? {} : { prefetch })}
      >
        {photo === null ? null : (
          <div className="relative aspect-square w-5xl shrink-0 overflow-hidden bg-paper-sunk sm:w-6xl">
            <Image
              src={photo.url}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="120px"
              quality={80}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0" {...(lang === undefined ? {} : { lang })}>
          {date === null ? null : <Byline isoDate={date} locale={locale} />}
          <h2 className={cn("font-display text-heading", date === null ? "" : "mt-2xs")}>
            {title}
          </h2>
          {summary.length === 0 ? null : (
            <p className="mt-xs max-w-measure text-body text-ink-muted">{summary}</p>
          )}
          <p className="mt-md inline-flex items-center gap-xs font-ui text-small font-medium text-aqua">
            <span>{action}</span>
            <ArrowIcon />
          </p>
        </div>
      </Link>
    </li>
  );
}
