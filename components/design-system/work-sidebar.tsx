import type { ReactNode } from "react";

import { cn } from "@/components/design-system/cn";
import { WorkIdentity } from "@/components/design-system/work-identity";

/**
 * El marco de trabajo: menú fijo a la izquierda, el contenido al lado.
 *
 * Lo usan el backoffice y `/cuenta` cuando hay sesión. No es el relato
 * público: es una lista de enlaces para alguien que ya está adentro y
 * necesita pasar de una pantalla a otra sin perder el índice. En
 * escritorio la columna es `fixed`: el contenido principal scrollea y
 * ella no. En el teléfono no se pinta: esas salidas viven en el drawer
 * del hamburguesa (ADR-032, ADR-037).
 */
export function sidebarItemClass(current: boolean) {
  return cn(
    "inline-flex min-h-touch shrink-0 items-center gap-sm rounded-md px-sm font-ui text-small transition-colors duration-fast lg:w-full",
    current
      ? "bg-sage/50 font-medium text-ink"
      : "text-ink-muted hover:bg-paper-sunk hover:text-ink",
  );
}

/** Cerrar sesión en el pie del menú de trabajo: bloque rojo, no un enlace más. */
export function sidebarSignOutClass() {
  return "inline-flex min-h-touch w-full items-center justify-center gap-sm rounded-md bg-danger px-sm font-ui text-small font-medium text-paper transition-colors duration-fast ease-editorial hover:bg-danger/90 active:translate-y-px";
}

export function WorkSidebar({
  accountHref,
  emptyName,
  nav,
  footer,
  children,
}: {
  accountHref: string;
  emptyName: string;
  nav: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="lg:flex">
      <aside className="hidden border-rule bg-paper lg:fixed lg:top-header lg:bottom-0 lg:left-0 lg:z-10 lg:block lg:w-sidebar lg:overflow-y-auto lg:border-r">
        <div className="flex h-full flex-col px-md py-lg sm:px-lg">
          <WorkIdentity href={accountHref} emptyName={emptyName} />
          <div className="mt-lg min-h-0 flex-1 overflow-x-auto lg:overflow-x-visible">
            {nav}
          </div>
          {footer === undefined ? null : (
            <div className="mt-lg border-t border-forest pt-md">{footer}</div>
          )}
        </div>
      </aside>
      <div className="hidden lg:block lg:w-sidebar lg:shrink-0" aria-hidden="true" />

      <div className="min-w-0 flex-1 px-md py-xl sm:px-lg lg:px-2xl">
        <div className="mx-auto max-w-page">{children}</div>
      </div>
    </div>
  );
}
