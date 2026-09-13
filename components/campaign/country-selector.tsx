"use client";

import { useRef } from "react";

import { cn } from "@/components/design-system/cn";

export type DonationRegion = "AR" | "CL" | "INT";

export const REGIONS: readonly DonationRegion[] = ["AR", "CL", "INT"];

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
 * Desde dónde aportás: Argentina, Chile o el resto del mundo (ADR-032).
 *
 * Es el patrón de tabs de ARIA —flechas, `aria-selected`, un solo tab en el
 * orden de tabulación— con el aspecto de un índice: texto y una regla debajo del
 * elegido. No son píldoras ni banderas: el nombre del país alcanza.
 */
export function CountrySelector({
  region,
  names,
  label,
  baseId,
  onChange,
  className,
}: {
  region: DonationRegion;
  names: Record<DonationRegion, string>;
  label: string;
  baseId: string;
  onChange: (next: DonationRegion) => void;
  className?: string;
}) {
  const refs = useRef(new Map<DonationRegion, HTMLButtonElement>());

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex border-b border-rule", className)}
      onKeyDown={(event) => {
        const next = moveIndex(REGIONS.length, REGIONS.indexOf(region), event.key);

        if (next === null) {
          return;
        }

        const target = REGIONS[next];

        if (target === undefined) {
          return;
        }

        event.preventDefault();
        onChange(target);
        refs.current.get(target)?.focus();
      }}
    >
      {REGIONS.map((item) => {
        const selected = region === item;

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
            className={cn(
              "-mb-px inline-flex min-h-12 items-center whitespace-nowrap border-b-2 px-md font-ui text-body transition-colors duration-fast ease-editorial first:pl-0",
              selected
                ? "border-forest font-medium text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
            onClick={() => {
              onChange(item);
            }}
          >
            {names[item]}
          </button>
        );
      })}
    </div>
  );
}
