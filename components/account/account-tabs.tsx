"use client";

import { SectionTabs, type TabItem } from "@/components/design-system/tabs";

import {
  ACCOUNT_SECTION_PARAM,
  isAccountSection,
  type AccountSection,
} from "./account-section";

/**
 * El índice de `/cuenta`.
 *
 * `SectionTabs` ya es el patrón: regla debajo, no píldoras, y sin JavaScript se
 * apilan los paneles. Acá sólo se recuerda la pestaña en `?seccion=` para que
 * guardar la foto o la contraseña no te devuelva a otra sección.
 */
export function AccountTabs({
  items,
  label,
  initial,
}: {
  items: readonly TabItem[];
  label: string;
  initial: AccountSection;
}) {
  return (
    <SectionTabs
      items={items}
      label={label}
      initial={initial}
      onChange={(id) => {
        if (!isAccountSection(id)) {
          return;
        }

        const url = new URL(window.location.href);

        url.searchParams.set(ACCOUNT_SECTION_PARAM, id);
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }}
    />
  );
}
