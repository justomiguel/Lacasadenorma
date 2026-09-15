"use client";

import { useFormStatus } from "react-dom";

import { cn } from "./cn";

/**
 * Un envío que se ve como texto, no como la primaria.
 *
 * Cerrar sesión, quitar la foto: si el botón no cambia mientras el POST va,
 * parece que no se tocó. El de acción grande ya tiene `pendingLabel`; éste
 * cubre los que se disfrazan de enlace.
 */
export function PendingTextButton({
  children,
  pendingLabel,
  className,
}: {
  children: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn("disabled:opacity-60", className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
