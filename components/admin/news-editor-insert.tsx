"use client";

import { useState, type ChangeEvent } from "react";

import { BusyCue } from "@/components/design-system/busy";
import { ChosenFile } from "@/components/design-system/chosen-file";
import { cn } from "@/components/design-system/cn";

import { extractCoverFrame } from "./extract-video-cover";
import type { MediaUploadFn, UploadedMedia } from "./news-editor-toolbar";

const INSERT =
  "inline-flex min-h-touch items-center justify-center rounded-sm bg-aqua px-lg py-xs font-ui text-small font-medium text-paper hover:bg-aqua-strong disabled:opacity-60";

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
  onCancel: (() => void) | null;
  onInserted: (item: UploadedMedia) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const accept =
    kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp";
  const pendingLabel = kind === "video" ? "Subiendo el video…" : "Subiendo la foto…";
  const actionLabel = kind === "video" ? "Adjuntar video" : "Adjuntar foto";

  return (
    <div className="space-y-sm" data-news-insert={kind} aria-busy={pending || undefined}>
      <fieldset disabled={pending} className="space-y-sm border-0 p-0">
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
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
          />
        </label>
        {file === null ? null : (
          <ChosenFile file={file} pending={pending} pendingLabel={pendingLabel} />
        )}
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
      </fieldset>
      {error === null ? null : (
        <p role="alert" className="font-ui text-small text-danger">
          {error}
        </p>
      )}
      {pending && file === null ? <BusyCue label={pendingLabel} /> : null}
      <div className="flex flex-wrap gap-sm">
        <button
          type="button"
          className={INSERT}
          disabled={pending}
          aria-busy={pending}
          onClick={(event) => {
            const root = event.currentTarget.closest("[data-news-insert]");
            const altInput = root?.querySelector<HTMLInputElement>(
              '[data-news-media="alt"]',
            );
            const captionInput = root?.querySelector<HTMLInputElement>(
              '[data-news-media="caption"]',
            );
            const creditInput = root?.querySelector<HTMLInputElement>(
              '[data-news-media="credit"]',
            );
            const alt = altInput?.value.trim() ?? "";
            const caption = captionInput?.value.trim() ?? "";
            const credit = creditInput?.value.trim() ?? "";

            if (file === null || alt.length < 10) {
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
          {pending ? pendingLabel : actionLabel}
        </button>
        {onCancel === null ? null : (
          <button type="button" className={INSERT} disabled={pending} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
