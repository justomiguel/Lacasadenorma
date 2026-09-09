"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { COUNTRY_NAMES, type CountryCode } from "@/src/domain/entities";

import { cn } from "./cn";

/**
 * Selector de país de aporte.
 *
 * Mejora progresiva de verdad: el primer render —el del servidor y el primero del
 * cliente— muestra **los tres países completos**, uno debajo del otro. Recién
 * después de montarse se convierte en tabs. Si el JavaScript no llega o falla,
 * quien entró igual ve los datos de su país y puede transferir.
 *
 * Es el patrón de tabs de ARIA: flechas para moverse, `aria-selected`, un solo
 * tab en el orden de tabulación, y el panel asociado por `aria-labelledby`.
 */

export interface CountryPanel {
  readonly country: CountryCode;
  readonly content: ReactNode;
}

/**
 * "¿Ya hidrató?" con la API que React tiene para eso.
 *
 * `getServerSnapshot` se usa en el render del servidor **y** en el de
 * hidratación, así que ese primer par de renders devuelve `false` y el marcado
 * coincide; recién el render siguiente devuelve `true`. Un `useEffect` con
 * `setState` conseguiría lo mismo, pero es la cascada de renders que React
 * ahora marca como error, y esta versión declara la intención en una línea.
 */
const NEVER_CHANGES = () => () => undefined;

function useHydrated(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

export function CountryTabs({
  panels,
  initialCountry,
  onCountryShown,
  className,
}: {
  panels: readonly CountryPanel[];
  initialCountry?: CountryCode;
  onCountryShown?: (country: CountryCode) => void;
  className?: string;
}) {
  const enhanced = useHydrated();
  const [selected, setSelected] = useState<CountryCode>(
    initialCountry ?? panels[0]?.country ?? "AR",
  );
  const baseId = useId();
  const tabRefs = useRef(new Map<CountryCode, HTMLButtonElement>());

  useEffect(() => {
    if (enhanced) {
      onCountryShown?.(selected);
    }
  }, [enhanced, selected, onCountryShown]);

  if (panels.length === 0) {
    return null;
  }

  if (!enhanced) {
    return (
      <div className={cn("space-y-3xl", className)}>
        {panels.map((panel) => (
          <section key={panel.country} aria-labelledby={`${baseId}-${panel.country}`}>
            <h3
              id={`${baseId}-${panel.country}`}
              className="mb-md font-ui text-subheading font-medium"
            >
              {COUNTRY_NAMES[panel.country]}
            </h3>
            {panel.content}
          </section>
        ))}
      </div>
    );
  }

  function focusTab(country: CountryCode) {
    setSelected(country);
    tabRefs.current.get(country)?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = panels.findIndex((panel) => panel.country === selected);

    if (index === -1) {
      return;
    }

    const move = (delta: number) => {
      event.preventDefault();
      const next = panels[(index + delta + panels.length) % panels.length];

      if (next !== undefined) {
        focusTab(next.country);
      }
    };

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      move(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      move(-1);
    } else if (event.key === "Home") {
      const first = panels[0];
      if (first !== undefined) {
        event.preventDefault();
        focusTab(first.country);
      }
    } else if (event.key === "End") {
      const last = panels[panels.length - 1];
      if (last !== undefined) {
        event.preventDefault();
        focusTab(last.country);
      }
    }
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Elegí desde qué país vas a transferir"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-3xs border-b border-rule"
      >
        {panels.map((panel) => {
          const isSelected = panel.country === selected;

          return (
            <button
              key={panel.country}
              ref={(node) => {
                if (node === null) {
                  tabRefs.current.delete(panel.country);
                } else {
                  tabRefs.current.set(panel.country, node);
                }
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${panel.country}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${panel.country}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => {
                setSelected(panel.country);
              }}
              className={cn(
                "min-h-touch px-md font-ui text-subheading transition-colors duration-fast ease-editorial",
                isSelected
                  ? "border-b-2 border-brick font-medium text-ink"
                  : "border-b-2 border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {COUNTRY_NAMES[panel.country]}
            </button>
          );
        })}
      </div>

      {panels.map((panel) => (
        <div
          key={panel.country}
          role="tabpanel"
          id={`${baseId}-panel-${panel.country}`}
          aria-labelledby={`${baseId}-tab-${panel.country}`}
          hidden={panel.country !== selected}
          className="pt-lg"
        >
          {panel.content}
        </div>
      ))}
    </div>
  );
}
