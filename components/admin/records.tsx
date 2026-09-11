import type { ReactNode } from "react";

import { cn } from "@/components/design-system/cn";

/**
 * Listas de registros.
 *
 * Son listas de definición y no tablas, con una excepción: cuando las columnas son
 * comparables entre filas —montos, fechas— una tabla dice más y se lee mejor con un
 * lector de pantalla. Acá el caso es el contrario: cada fila del backoffice tiene su
 * propio conjunto de datos y sus propias acciones, así que una tabla obligaría a
 * celdas vacías y a acciones dentro de una celda, que es donde el foco se pierde.
 *
 * El libro de gastos público sí es una tabla, y vive en el sistema de diseño.
 */

export function RecordList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={cn("border-t border-rule", className)}>{children}</ul>;
}

export function Record({
  title,
  meta,
  amount,
  status,
  children,
  muted = false,
}: {
  title: ReactNode;
  meta?: ReactNode;
  amount?: string;
  /** Estado del registro, en palabras. Nunca sólo un color (WCAG 1.4.1). */
  status?: string;
  children?: ReactNode;
  /** Un registro anulado sigue estando, atenuado y con su motivo a la vista. */
  muted?: boolean;
}) {
  return (
    <li className="border-b border-rule py-md">
      <div className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs">
        <p
          className={cn(
            "font-ui text-body",
            muted ? "text-ink-muted line-through decoration-1" : "text-ink",
          )}
        >
          {title}
        </p>
        {amount === undefined ? null : (
          <p
            data-figure
            className={cn(
              "font-ui text-subheading font-medium",
              muted ? "text-ink-faint" : "text-ink",
            )}
          >
            {amount}
          </p>
        )}
      </div>

      {meta === undefined && status === undefined ? null : (
        <p className="mt-2xs font-ui text-small text-ink-muted">
          {meta}
          {status === undefined ? null : (
            <>
              {meta === undefined ? null : " · "}
              <span className={muted ? "text-danger" : "text-ink-muted"}>{status}</span>
            </>
          )}
        </p>
      )}

      {children === undefined ? null : <div className="mt-sm">{children}</div>}
    </li>
  );
}

/** Nada que mostrar, con el motivo. Nunca una lista vacía sin explicación (FR-035). */
export function NoRecords({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-rule pt-md font-ui text-small text-ink-muted">
      {children}
    </p>
  );
}

/**
 * Un detalle desplegable dentro de una fila: el formulario de anulación, el de
 * corrección. Se usa `<details>` nativo a propósito, sin JavaScript: es accesible por
 * teclado, funciona sin hidratar, y el estado abierto/cerrado lo maneja el navegador.
 */
export function RowAction({
  label,
  children,
  tone = "quiet",
}: {
  label: string;
  children: ReactNode;
  tone?: "quiet" | "danger";
}) {
  return (
    <details className="group">
      <summary
        className={cn(
          "inline-flex min-h-touch cursor-pointer list-none items-center font-ui text-small underline decoration-1 underline-offset-4",
          tone === "danger" ? "text-danger" : "text-ink-muted hover:text-ink",
        )}
      >
        {label}
      </summary>
      <div className="mt-sm max-w-measure border-l-2 border-rule pl-md">{children}</div>
    </details>
  );
}
