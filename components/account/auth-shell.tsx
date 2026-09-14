import type { ReactNode } from "react";

import { Container, Section } from "@/components/design-system/layout";
import { PageHeader } from "@/components/site/page-header";

/**
 * El marco de las pantallas de cuenta.
 *
 * Usa el encabezado y la grilla del sitio público, no el marco del backoffice.
 * `/cuenta` es una página del sitio: quien llega viene de leer qué falta para la
 * casa, y mandarlo a una pantalla que se ve distinta —otro tipo, otra paleta,
 * otro margen— lo hace dudar de si sigue en el lugar correcto.
 *
 * El pie es el `aside`: el enlace a la otra pantalla de la sección —"¿ya tenés
 * cuenta?", "olvidé mi contraseña"— va **después** del formulario y no arriba,
 * porque arriba compite con la acción que la persona vino a hacer.
 */
export function AuthShell({
  title,
  lead,
  children,
  aside,
}: {
  title: string;
  lead: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <>
      <PageHeader mark title={title} lead={lead} />

      <Container>
        <Section>
          {children}

          {aside === undefined ? null : (
            <div className="mt-2xl max-w-measure border-t border-rule pt-lg font-ui text-small text-ink-muted">
              {aside}
            </div>
          )}
        </Section>
      </Container>
    </>
  );
}
