"use client";

import { useSyncExternalStore } from "react";

export type Channel = "transfer" | "mercadopago" | "paypal";
export type Country = "AR" | "CL";

export const CHANNELS: Channel[] = ["transfer", "mercadopago", "paypal"];
export const COUNTRIES: Country[] = ["AR", "CL"];

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
