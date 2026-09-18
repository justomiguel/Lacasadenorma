"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { ICON_ACTION, PrimaryAction } from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import { CloseIcon } from "@/components/design-system/icons";
import type { CatalogContent } from "@/content/schema";

/**
 * El teléfono reservó: el gracias tapa la ficha (ADR-051). Un diálogo
 * centrado, `aria-modal`, no un `alert()`. Sin JavaScript el velo y
 * «Entendido» siguen ahí.
 */
export function OfferThanksNotice({
  copy,
  dismissHref,
}: {
  copy: CatalogContent;
  dismissHref: string;
}) {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = dialog.current;

    if (root === null) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        window.location.assign(dismissHref);
        return;
      }

      if (event.key !== "Tab" || root === null) {
        return;
      }

      const focusable = [
        ...root.querySelectorAll<HTMLElement>(
          "a[href]:not([tabindex='-1']), button:not([disabled])",
        ),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (first === undefined || last === undefined) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [dismissHref]);

  return (
    <div
      ref={dialog}
      id="gracias"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gracias-titulo"
      aria-describedby="gracias-cuerpo"
      tabIndex={-1}
      className="fixed inset-0 z-40 flex items-center justify-center px-5 outline-none"
    >
      <a
        href={dismissHref}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/70"
      />
      <div className="relative w-full max-w-measure bg-paper px-lg pb-lg pt-xl">
        <Link
          href={dismissHref}
          aria-label={copy.offerThanksClose}
          className={cn(ICON_ACTION, "absolute right-sm top-sm text-ink")}
        >
          <CloseIcon size={24} />
        </Link>
        <h2 id="gracias-titulo" className="pr-2xl font-display text-heading text-ink">
          {copy.offerThanksTitle}
        </h2>
        <p id="gracias-cuerpo" className="mt-md text-body text-ink">
          {copy.offerThanksBody}
        </p>
        <PrimaryAction href={dismissHref} className="mt-lg sm:w-full">
          {copy.offerThanksDismiss}
        </PrimaryAction>
      </div>
    </div>
  );
}
