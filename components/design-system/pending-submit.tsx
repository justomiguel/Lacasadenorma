"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import { cn } from "./cn";

/**
 * Un envío que se ve como texto, no como la primaria.
 *
 * Cerrar sesión, quitar la foto: si el botón no cambia mientras el POST va,
 * parece que no se tocó. El de acción grande ya tiene `pendingLabel`; éste
 * cubre los que se disfrazan de enlace. El icono es optativo: el drawer lo
 * usa para barrer; el resto de call sites sigue siendo sólo texto.
 */
export function PendingTextButton({
  children,
  pendingLabel,
  className,
  icon,
}: {
  children: string;
  pendingLabel: string;
  className?: string;
  icon?: ReactNode;
}) {
  const { pending } = useFormStatus();
  const label = pending ? pendingLabel : children;

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn("disabled:opacity-60", className)}
    >
      {icon}
      {label}
    </button>
  );
}
