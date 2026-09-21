"use client";

import { useRef, useState } from "react";

import { ICON_ACTION } from "@/components/design-system/actions";
import { BrandLabel } from "@/components/design-system/brand-mark";
import { cn } from "@/components/design-system/cn";
import { CopyIcon } from "@/components/design-system/icons";
import { whatsappHrefFor } from "@/src/domain/whatsapp";

/**
 * El enlace de un solo uso para entrar a una cuenta cargada por el equipo.
 *
 * Copiar es `ICON_ACTION`. WhatsApp, si el teléfono alcanza, lleva la marca
 * antes del nombre (ADR-047).
 */
export function DonorInviteShare({
  email,
  inviteUrl,
  phone,
}: {
  email: string;
  inviteUrl: string;
  phone?: string | null;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const whatsapp = whatsappHrefFor(phone ?? "");
  const whatsappHref =
    whatsapp === null ? null : `${whatsapp}?text=${encodeURIComponent(inviteUrl)}`;

  async function copyLink() {
    if (timeout.current !== null) {
      clearTimeout(timeout.current);
    }

    try {
      if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
        throw new Error("clipboard-unavailable");
      }

      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    timeout.current = setTimeout(() => {
      setCopyState("idle");
    }, 1500);
  }

  return (
    <div className="space-y-sm">
      <p className="font-ui text-small text-ink">
        Correo: <span className="break-words">{email}</span>
      </p>
      <p className="break-all font-ui text-small text-ink">{inviteUrl}</p>
      <div className="flex flex-wrap items-center gap-md">
        <button
          type="button"
          onClick={() => {
            void copyLink();
          }}
          aria-label={copyState === "copied" ? "Enlace copiado" : "Copiar el enlace"}
          className={cn(
            ICON_ACTION,
            copyState === "copied" ? "text-success" : "text-forest",
          )}
        >
          <CopyIcon />
        </button>
        {whatsappHref === null ? null : (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-touch items-center font-ui text-small text-ink underline decoration-1 underline-offset-4 hover:text-aqua-strong"
          >
            <BrandLabel id="whatsapp">WhatsApp</BrandLabel>
          </a>
        )}
      </div>
      <p
        aria-live="polite"
        className={
          copyState === "failed" ? "font-ui text-caption text-danger" : "sr-only"
        }
      >
        {copyState === "copied" ? "Se copió el enlace." : null}
        {copyState === "failed"
          ? "No pudimos copiar el enlace. Seleccionalo y copialo a mano."
          : null}
      </p>
    </div>
  );
}
