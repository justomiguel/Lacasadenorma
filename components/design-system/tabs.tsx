"use client";

import { useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { cn } from "./cn";

/**
 * Pestañas de sección.
 *
 * Es el patrón de tabs de ARIA: flechas para moverse, `aria-selected`, un solo
 * tab en el orden de tabulación, y el panel asociado por `aria-labelledby`.
 *
 * Mejora progresiva de verdad: el render del servidor y el primero del cliente
 * muestran **todas las pestañas abiertas, una debajo de otra**, cada una con su
 * título. Recién después de montarse se convierten en pestañas. Si el JavaScript
 * no llega, quien entró igual lee todo y puede actuar.
 *
 * El estilo es el de un índice editorial —texto con una regla debajo y el
 * seleccionado marcado con una regla más gruesa—, y no el de píldoras, a
 * propósito: dentro de un panel puede haber un segundo nivel de opciones (los
 * canales de donación), y dos niveles con la misma forma no se distinguen.
 *
 * El subrayado de la pestaña activa se pinta por dentro (`aria-selected` en
 * `globals.css`). `overflow-x` en este tablist recorta cualquier `-mb-px`.
 */

export interface TabItem {
  readonly id: string;
  readonly label: ReactNode;
  /**
   * Título del panel cuando se muestra apilado, sin JavaScript. Si el contenido
   * ya trae su propio encabezado, se omite para no duplicarlo.
   */
  readonly heading?: string;
  readonly content: ReactNode;
}

const NEVER_CHANGES = () => () => undefined;

function useHydrated(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

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

export function SectionTabs({
  items,
  label,
  initial,
  onChange,
  className,
}: {
  items: readonly TabItem[];
  label: string;
  initial?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  const enhanced = useHydrated();
  const [selected, setSelected] = useState<string>(initial ?? items[0]?.id ?? "");
  /* La entrada animada del panel es para el cambio de pestaña, no para la
     hidratación: el primer panel aparece quieto, como venía en el HTML servido. */
  const [changed, setChanged] = useState(false);
  const baseId = useId();
  const refs = useRef(new Map<string, HTMLButtonElement>());

  if (items.length === 0) {
    return null;
  }

  if (!enhanced) {
    return (
      <div className={cn("space-y-3xl", className)}>
        {items.map((item) => (
          <section
            key={item.id}
            {...(item.heading === undefined
              ? {}
              : { "aria-labelledby": `${baseId}-heading-${item.id}` })}
            className="border-t border-rule pt-lg"
          >
            {item.heading === undefined ? null : (
              <h3
                id={`${baseId}-heading-${item.id}`}
                className="mb-lg font-display text-section-title"
              >
                {item.heading}
              </h3>
            )}
            {item.content}
          </section>
        ))}
      </div>
    );
  }

  const active = items.find((item) => item.id === selected) ?? items[0];

  if (active === undefined) {
    return null;
  }

  function select(id: string) {
    setSelected(id);
    setChanged(true);
    onChange?.(id);
    refs.current.get(id)?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex min-w-0 max-w-full overflow-x-auto overscroll-x-contain border-b border-rule"
        onKeyDown={(event) => {
          const index = items.findIndex((item) => item.id === active.id);
          const next = moveIndex(items.length, index, event.key);

          if (next === null) {
            return;
          }

          event.preventDefault();

          const target = items[next];

          if (target !== undefined) {
            select(target.id);
            refs.current.get(target.id)?.focus();
          }
        }}
      >
        {items.map((item) => {
          const isSelected = item.id === active.id;

          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node === null) {
                  refs.current.delete(item.id);
                } else {
                  refs.current.set(item.id, node);
                }
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel`}
              tabIndex={isSelected ? 0 : -1}
              className={cn(
                "inline-flex min-h-touch shrink-0 items-center whitespace-nowrap px-md font-ui text-body transition-colors duration-fast first:pl-0",
                isSelected ? "font-medium text-ink" : "text-ink-muted hover:text-ink",
              )}
              onClick={() => {
                select(item.id);
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        key={active.id}
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        {...(changed ? { "data-tab-panel": "" } : {})}
        className="pt-xl"
      >
        {active.content}
      </div>
    </div>
  );
}
