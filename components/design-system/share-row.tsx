"use client";

import { useState } from "react";

import { useUiOptional } from "@/components/i18n/ui-provider";
import { BRANDS, type BrandId } from "@/content/brands";

import { BrandMark } from "./brand-mark";
import { cn } from "./cn";

/**
 * Compartir.
 *
 * Usa `navigator.share` cuando existe, porque en un teléfono es la vía que
 * abre WhatsApp con un toque. Cuando no existe, **hay enlaces reales**: no un
 * botón muerto ni un modal propio que imita el del sistema.
 *
 * Los enlaces se renderizan siempre en el HTML servido, así que funcionan sin
 * JavaScript.
 */

export interface ShareTarget {
  readonly label: string;
  readonly href: string;
  readonly channel: BrandId;
}

export function buildShareTargets(url: string, text: string): ShareTarget[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return [
    {
      label: BRANDS.whatsapp.name,
      channel: "whatsapp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      label: BRANDS.facebook.name,
      channel: "facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: BRANDS.linkedin.name,
      channel: "linkedin",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: BRANDS.x.name,
      channel: "x",
      href: `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`,
    },
  ];
}

export function ShareRow({
  url,
  title,
  text,
  onShared,
  className,
}: {
  url: string;
  title: string;
  text: string;
  onShared?: (channel: string) => void;
  className?: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const targets = buildShareTargets(url, text);
  const ui = useUiOptional()?.ui;
  const shareLabel = ui?.share ?? "Compartir";
  const copyLinkLabel = ui?.copyLink ?? "Copiar enlace";
  const linkCopiedLabel = ui?.linkCopied ?? "Enlace copiado";
  const linkCopiedLive = ui?.linkCopiedLive ?? "Se copió el enlace de la página.";
  const linkCopyFailed =
    ui?.linkCopyFailed ?? "No pudimos copiar el enlace. Seleccionalo y copialo a mano.";

  async function shareNative() {
    try {
      await navigator.share({ title, text, url });
      onShared?.("sistema");
    } catch {
      // Cancelar el diálogo del sistema lanza AbortError. No es un fallo del
      // sitio y no hay nada que informar: quien canceló ya sabe que canceló.
    }
  }

  async function copyLink() {
    try {
      if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
        throw new Error("clipboard-unavailable");
      }

      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      onShared?.("enlace");
      setTimeout(() => {
        setCopyState("idle");
      }, 4000);
    } catch {
      setCopyState("failed");
    }
  }

  const canShareNatively = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className={cn("flex flex-wrap items-center gap-md", className)}>
      {canShareNatively ? (
        <button
          type="button"
          onClick={() => {
            void shareNative();
          }}
          className="inline-flex min-h-touch items-center rounded-sm bg-paper-sunk px-md font-ui text-small font-medium text-ink transition-colors duration-fast ease-editorial hover:bg-rule"
        >
          {shareLabel}
        </button>
      ) : null}

      <ul className="flex flex-wrap items-center gap-sm">
        {targets.map((target) => (
          <li key={target.channel}>
            <a
              href={target.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onShared?.(target.channel);
              }}
              className="inline-flex min-h-touch items-center gap-xs font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-aqua-strong"
            >
              <BrandMark id={target.channel} />
              {target.label}
            </a>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => {
              void copyLink();
            }}
            className="inline-flex min-h-touch items-center font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-aqua-strong"
          >
            {copyState === "copied" ? linkCopiedLabel : copyLinkLabel}
          </button>
        </li>
      </ul>

      <p
        aria-live="polite"
        className={
          copyState === "failed"
            ? "basis-full font-ui text-caption text-danger"
            : "sr-only"
        }
      >
        {copyState === "copied" ? linkCopiedLive : null}
        {copyState === "failed" ? linkCopyFailed : null}
      </p>
      {copyState === "failed" ? (
        <p className="basis-full break-all font-ui text-caption text-ink">{url}</p>
      ) : null}
    </div>
  );
}
