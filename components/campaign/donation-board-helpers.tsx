"use client";

import { useRef, useSyncExternalStore, type ReactNode } from "react";

import { BrandLabel } from "@/components/design-system/brand-mark";
import { cn } from "@/components/design-system/cn";
import type { BrandId } from "@/content/brands";

export type Channel = "transfer" | "mercadopago" | "paypal";
export type Country = "AR" | "CL";

export const CHANNELS: Channel[] = ["transfer", "mercadopago", "paypal"];
export const COUNTRIES: Country[] = ["AR", "CL"];

export const CHANNEL_BRAND: Partial<Record<Channel, BrandId>> = {
  mercadopago: "mercadopago",
  paypal: "paypal",
};

export function ChannelLabel({
  channel,
  children,
}: {
  channel: Channel;
  children: ReactNode;
}) {
  const brand = CHANNEL_BRAND[channel];

  if (brand === undefined) {
    return children;
  }

  return <BrandLabel id={brand}>{children}</BrandLabel>;
}

const NEVER_CHANGES = () => () => undefined;

export function useHydrated(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

export function Flag({ country }: { country: Country }) {
  return (
    <span aria-hidden="true" className="text-[1.1em] leading-none">
      {country === "AR" ? "🇦🇷" : "🇨🇱"}
    </span>
  );
}

export function nextItem<T>(items: readonly T[], current: T, key: string): T | null {
  const index = items.indexOf(current);

  if (index === -1) {
    return null;
  }

  if (key === "ArrowRight" || key === "ArrowDown") {
    return items[(index + 1) % items.length] ?? null;
  }

  if (key === "ArrowLeft" || key === "ArrowUp") {
    return items[(index - 1 + items.length) % items.length] ?? null;
  }

  if (key === "Home") {
    return items[0] ?? null;
  }

  if (key === "End") {
    return items[items.length - 1] ?? null;
  }

  return null;
}

export function countryPanelClass(
  enhanced: boolean,
  active: Country,
  item: Country,
): string {
  return enhanced && active !== item ? "min-w-0 max-lg:hidden" : "min-w-0";
}

export function DonationCountryTabs({
  country,
  countryNames,
  label,
  onCountry,
}: {
  country: Country;
  countryNames: Record<Country, string>;
  label: string;
  onCountry: (next: Country) => void;
}) {
  const countryRefs = useRef(new Map<Country, HTMLButtonElement>());

  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-lg flex gap-sm lg:hidden"
      onKeyDown={(event) => {
        const next = nextItem(COUNTRIES, country, event.key);

        if (next === null) {
          return;
        }

        event.preventDefault();
        onCountry(next);
        countryRefs.current.get(next)?.focus();
      }}
    >
      {COUNTRIES.map((item) => {
        const selected = country === item;

        return (
          <button
            key={item}
            ref={(node) => {
              if (node === null) {
                countryRefs.current.delete(item);
              } else {
                countryRefs.current.set(item, node);
              }
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cn(
              "lift-hover inline-flex min-h-touch items-center gap-xs rounded-pill px-md font-ui text-small",
              selected
                ? "bg-forest text-paper"
                : "border border-rule text-ink hover:border-forest",
            )}
            onClick={() => {
              onCountry(item);
            }}
          >
            <Flag country={item} />
            {countryNames[item]}
          </button>
        );
      })}
    </div>
  );
}
