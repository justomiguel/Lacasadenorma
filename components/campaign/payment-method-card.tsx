import type { ReactNode } from "react";

import { cn } from "@/components/design-system/cn";

/**
 * Un método de aporte, como caja propia.
 *
 * Transferencia y Mercado Pago conviven en el mismo país: sin esta pieza se
 * leen como una sola lista. El logo del banco o de Mercado Pago va al lado del
 * título, no como adorno: es lo que distingue un canal del otro.
 */
export function PaymentMethodCard({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("min-w-0 rounded-md border border-rule bg-paper p-md", className)}
    >
      <h4 className="flex min-w-0 items-center gap-sm font-ui text-body-large font-medium">
        {title}
      </h4>
      <div className="mt-md border-t border-rule pt-sm">{children}</div>
    </section>
  );
}
