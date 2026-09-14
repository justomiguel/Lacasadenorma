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
import { usePathname } from "next/navigation";

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
      /** `true` sólo con rol interno. El público no lo ve ni lo recibe. */
      readonly staff: boolean;
    };

/**
 * El fetch del chrome trae JSON. Sin esto, un campo de más o de menos —o un
 * `staff` que no es boolean— se colaría al menú.
 */
export function readChromeSession(data: unknown): ChromeSession {
  if (typeof data !== "object" || data === null) {
    return { status: "anonymous" };
  }

  const record = data as Record<string, unknown>;

  if (record["status"] !== "signed-in") {
    return { status: "anonymous" };
  }

  return {
    status: "signed-in",
    displayName: typeof record["displayName"] === "string" ? record["displayName"] : null,
    email: typeof record["email"] === "string" ? record["email"] : null,
    hasPortrait: record["hasPortrait"] === true,
    staff: record["staff"] === true,
  };
}

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
  const pathname = usePathname();
  const endpoint = localizedHref("/cuenta/sesion", locale);
  const retrato = localizedHref("/cuenta/retrato", locale);

  const refresh = useCallback(() => {
    setGeneration((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // `pathname` está a propósito: un redirect de Server Action no desmonta
    // este provider. Sin volver a pedir, el encabezado seguiría diciendo
    // «Ingresar» después de entrar, y el nombre después de salir.

    void fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return { status: "anonymous" } satisfies ChromeSession;
        }

        return readChromeSession(await response.json());
      })
      .then((next) => {
        if (!cancelled) {
          setSession(next);
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
  }, [endpoint, generation, pathname]);

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
