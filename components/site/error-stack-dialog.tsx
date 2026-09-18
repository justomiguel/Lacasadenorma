"use client";

import { useEffect, useRef, useState } from "react";

import { ICON_ACTION, primaryActionClass } from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import { CloseIcon } from "@/components/design-system/icons";
import {
  formatErrorDiagnostic,
  type ErrorDiagnostic,
} from "@/src/infrastructure/logging/error-diagnostic";

import type { ErrorPageCopy } from "./error-screen";

/**
 * Un error que no deshizo la página —el correo después de reservar— con el
 * toggle prendido (ADR-053). Encima de todo, incluido el gracias.
 */
export function ErrorStackDialog({
  copy,
  diagnostic,
}: {
  copy: ErrorPageCopy;
  diagnostic: ErrorDiagnostic;
}) {
  const [open, setOpen] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const detail = formatErrorDiagnostic(diagnostic);

  useEffect(() => {
    if (!open) {
      return;
    }

    const node = root.current;

    if (node === null) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-stack-titulo"
      aria-describedby="error-stack-cuerpo"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center px-5 outline-none"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/70"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-measure bg-paper px-lg pb-lg pt-xl">
        <button
          type="button"
          aria-label={copy.close}
          className={cn(ICON_ACTION, "absolute right-sm top-sm text-ink")}
          onClick={() => setOpen(false)}
        >
          <CloseIcon size={24} />
        </button>
        <h2 id="error-stack-titulo" className="pr-2xl font-display text-heading text-ink">
          {copy.title}
        </h2>
        <p id="error-stack-cuerpo" className="mt-md text-body text-ink">
          {copy.lead}
        </p>
        <p className="mt-lg font-ui text-small text-olive">{copy.stackLabel}</p>
        <pre className="mt-sm max-h-96 overflow-auto bg-paper-sunk p-md font-ui text-small text-ink whitespace-pre-wrap">
          {detail}
        </pre>
        <button
          type="button"
          className={cn(primaryActionClass(), "mt-lg sm:w-full")}
          onClick={() => setOpen(false)}
        >
          {copy.close}
        </button>
      </div>
    </div>
  );
}
