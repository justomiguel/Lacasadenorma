"use client";

import { useState } from "react";

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
  readonly channel: string;
}

export function buildShareTargets(url: string, text: string): ShareTarget[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return [
    {
      label: "WhatsApp",
      channel: "whatsapp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      label: "Facebook",
      channel: "facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "LinkedIn",
      channel: "linkedin",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "X",
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
  const [copied, setCopied] = useState(false);
  const targets = buildShareTargets(url, text);

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
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShared?.("enlace");
      setTimeout(() => {
        setCopied(false);
      }, 4000);
    } catch {
      setCopied(false);
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
          Compartir
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
              className="inline-flex min-h-touch items-center font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-brick-strong"
            >
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
            className="inline-flex min-h-touch items-center font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-brick-strong"
          >
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </button>
        </li>
      </ul>

      <p aria-live="polite" className="sr-only">
        {copied ? "Se copió el enlace de la página." : null}
      </p>
    </div>
  );
}
