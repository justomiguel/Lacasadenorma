"use client";

import { useRef } from "react";

import { cn } from "@/components/design-system/cn";
import { CameraIcon, VideoIcon } from "@/components/design-system/icons";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";

const KINDS = ["photo", "video"] as const;

export type MediaInsertKind = (typeof KINDS)[number];

function moveIndex(count: number, current: number, key: string): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/**
 * Foto o video: dos tabs con marca antes del nombre (ADR-047). No son
 * herramientas de formato: son el camino para adjuntar, y tienen que
 * reconocerse de un vistazo.
 */
export function MediaKindTabs({
  kind,
  baseId,
  onChange,
}: {
  kind: MediaInsertKind;
  baseId: string;
  onChange: (kind: MediaInsertKind) => void;
}) {
  const refs = useRef(new Map<MediaInsertKind, HTMLButtonElement>());

  return (
    <div
      role="tablist"
      aria-label="Tipo de archivo"
      className="flex border-b border-rule"
      onKeyDown={(event) => {
        const next = moveIndex(KINDS.length, KINDS.indexOf(kind), event.key);

        if (next === null) {
          return;
        }

        const target = KINDS[next];

        if (target === undefined) {
          return;
        }

        event.preventDefault();
        onChange(target);
        refs.current.get(target)?.focus();
      }}
    >
      {KINDS.map((item) => {
        const selected = kind === item;
        const label = item === "photo" ? "Foto" : "Video";

        return (
          <button
            key={item}
            ref={(node) => {
              if (node === null) {
                refs.current.delete(item);
              } else {
                refs.current.set(item, node);
              }
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel`}
            tabIndex={selected ? 0 : -1}
            data-media-kind={item}
            className={cn(
              "inline-flex min-h-touch items-center gap-xs px-sm font-ui text-small first:pl-0",
              selected ? "font-medium text-ink" : "text-ink-muted hover:text-ink",
            )}
            onClick={() => {
              onChange(item);
            }}
          >
            <IdentifyingMark data-media-mark={item} className="text-olive">
              {item === "photo" ? <CameraIcon /> : <VideoIcon />}
            </IdentifyingMark>
            {label}
          </button>
        );
      })}
    </div>
  );
}
