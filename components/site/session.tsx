"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * El snapshot de cuenta que el chrome pide después de hidratar (ADR-037).
 *
 * El HTML público sigue siendo el de alguien sin sesión. Este contexto no se
 * rellena en el servidor a propósito: si se rellenara, `PublicDocument` leería
 * cookies y las páginas dejarían de ser cacheables.
 */

export type ChromeSession =
  | { readonly status: "anonymous" }
  | {
      readonly status: "signed-in";
      readonly displayName: string | null;
      readonly email: string | null;
      readonly hasPortrait: boolean;
    };

interface SessionValue {
  readonly session: ChromeSession;
  readonly portraitSrc: string | null;
  readonly refresh: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [session, setSession] = useState<ChromeSession>({ status: "anonymous" });
  const [generation, setGeneration] = useState(0);
  const endpoint = localizedHref("/cuenta/sesion", locale);
  const retrato = localizedHref("/cuenta/retrato", locale);

  const refresh = useCallback(() => {
    setGeneration((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return { status: "anonymous" } satisfies ChromeSession;
        }

        return (await response.json()) as ChromeSession;
      })
      .then((next) => {
        if (!cancelled) {
          setSession(next.status === "signed-in" ? next : { status: "anonymous" });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSession({ status: "anonymous" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, generation]);

  const value = useMemo<SessionValue>(() => {
    const portraitSrc =
      session.status === "signed-in" && session.hasPortrait
        ? `${retrato}?v=${String(generation)}`
        : null;

    return { session, portraitSrc, refresh };
  }, [generation, retrato, session, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useChromeSession(): SessionValue {
  const value = useContext(SessionContext);

  if (value === null) {
    throw new Error("useChromeSession tiene que usarse dentro de SessionProvider.");
  }

  return value;
}
