"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { BrandLabel } from "@/components/design-system/brand-mark";
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
