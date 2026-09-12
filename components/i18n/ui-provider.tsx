"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { UiContent } from "@/content/schema";
import type { Locale } from "@/src/i18n/locale";

/**
 * El chrome de cliente recibe **un** paquete de interfaz, el del idioma de la
 * página. Nunca los dos: eso volvería a cruzar el contenido al bundle
 * (ADR-022, ADR-023).
 */

const UiContext = createContext<{ locale: Locale; ui: UiContent } | null>(null);

export function UiProvider({
  locale,
  ui,
  children,
}: {
  locale: Locale;
  ui: UiContent;
  children: ReactNode;
}) {
  return <UiContext.Provider value={{ locale, ui }}>{children}</UiContext.Provider>;
}

export function useUi(): { locale: Locale; ui: UiContent } {
  const value = useContext(UiContext);

  if (value === null) {
    throw new Error("useUi tiene que usarse dentro de UiProvider.");
  }

  return value;
}

export function useUiOptional(): { locale: Locale; ui: UiContent } | null {
  return useContext(UiContext);
}
