"use client";

import { useState } from "react";

import { cn } from "@/components/design-system/cn";

import { extractCoverFrame } from "./extract-video-cover";

const TOOL =
  "inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-rule bg-paper px-sm font-ui text-small text-ink hover:bg-paper-sunk aria-pressed:border-forest aria-pressed:bg-paper-sunk disabled:opacity-50";

export function EditorToolButton({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed?: boolean;
  onClick: () => void;
  label: string;
  children: string;
}) {
  return (
    <button
      type="button"
      className={TOOL}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export type UploadedMedia = {
  mediaId: string;
  kind: "photo" | "video";
  url: string;
  alt: string;
};

export type MediaUploadFn = (data: FormData) => Promise<{
  status: string;
  message: string;
  value?: { mediaId: string; kind: "photo" | "video"; url: string };
}>;

export function MediaInsertPanel({
  kind,
  updateId,
  slug,
  upload,
  onCancel,
  onInserted,
}: {
  kind: "photo" | "video";
  updateId: string;
  slug: string;
  upload: MediaUploadFn;
  onCancel: () => void;
  onInserted: (item: UploadedMedia) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const accept =
    kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp";

  return (
    <div
      className="space-y-sm border border-rule bg-paper-sunk p-md"
      data-news-insert={kind}
    >
      <p className="font-ui text-small font-medium text-ink">
        {kind === "video" ? "Video" : "Foto"}
      </p>
      <label className="block font-ui text-small text-ink">
        Archivo
        <input
          data-news-media="file"
          type="file"
          required
          accept={accept}
          className={cn(
            "mt-2xs w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body",
          )}
        />
      </label>
      <label className="block font-ui text-small text-ink">
        Qué se ve
        <input
          data-news-media="alt"
          type="text"
          required
          minLength={10}
          maxLength={300}
          className={cn(
            "mt-2xs w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body",
          )}
        />
      </label>
      <label className="block font-ui text-small text-ink">
        Epígrafe
        <span className="ml-2xs font-normal text-ink-faint">(opcional)</span>
        <input
          data-news-media="caption"
          type="text"
          maxLength={300}
          className={cn(
            "mt-2xs w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body",
          )}
        />
      </label>
      <label className="block font-ui text-small text-ink">
        Crédito
        <span className="ml-2xs font-normal text-ink-faint">(opcional)</span>
        <input
          data-news-media="credit"
          type="text"
          maxLength={120}
          className={cn(
            "mt-2xs w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body",
          )}
        />
      </label>
      {error === null ? null : (
        <p role="alert" className="font-ui text-small text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-sm">
        <button
          type="button"
          className={TOOL}
          disabled={pending}
          onClick={(event) => {
            const root = event.currentTarget.closest("[data-news-insert]");
            const fileInput = root?.querySelector<HTMLInputElement>(
              '[data-news-media="file"]',
            );
            const altInput = root?.querySelector<HTMLInputElement>(
              '[data-news-media="alt"]',
            );
            const captionInput = root?.querySelector<HTMLInputElement>(
              '[data-news-media="caption"]',
            );
            const creditInput = root?.querySelector<HTMLInputElement>(
              '[data-news-media="credit"]',
            );
            const file = fileInput?.files?.[0];
            const alt = altInput?.value.trim() ?? "";
            const caption = captionInput?.value.trim() ?? "";
            const credit = creditInput?.value.trim() ?? "";

            if (file === undefined || alt.length < 10) {
              setError(
                "Elegí un archivo y escribí qué se ve, en al menos diez caracteres.",
              );
              return;
            }

            setPending(true);
            setError(null);

            void (async () => {
              const data = new FormData();
              data.set("updateId", updateId);
              data.set("slug", slug);
              data.set("file", file);
              data.set("alt", alt);
              data.set("caption", caption);
              data.set("credit", credit);

              if (kind === "video") {
                try {
                  data.set("poster", await extractCoverFrame(file));
                } catch (cause) {
                  console.error("No se pudo extraer el fotograma de portada.", cause);
                }
              }

              try {
                const result = await upload(data);

                if (result.status !== "ok" || result.value === undefined) {
                  setError(result.message);
                  return;
                }

                onInserted({
                  mediaId: result.value.mediaId,
                  kind: result.value.kind,
                  url: result.value.url,
                  alt,
                });
              } catch (cause) {
                console.error("No se pudo subir el archivo.", cause);
                setError("No pudimos subir el archivo. Probá de nuevo.");
              } finally {
                setPending(false);
              }
            })();
          }}
        >
          {pending ? "Subiendo…" : "Insertar"}
        </button>
        <button type="button" className={TOOL} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
