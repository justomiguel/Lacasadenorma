"use client";

export const TOOL =
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
      aria-pressed={pressed === true}
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
