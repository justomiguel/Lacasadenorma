import type { ReactNode } from "react";

import { Band, Container, Section } from "@/components/design-system/layout";
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
 *
 * `surface="sunk"` queda para un cuerpo que empieza pegado al encabezado.
 * Ingresar y crear una cuenta se quedan en papel: son un formulario, no un índice.
 */
export function AuthShell({
  title,
  lead,
  children,
  aside,
  surface = "paper",
}: {
  title: string;
  lead: string;
  children: ReactNode;
  aside?: ReactNode;
  surface?: "paper" | "sunk";
}) {
  const body = (
    <>
      {children}

      {aside === undefined ? null : (
        <div className="mt-2xl max-w-measure border-t border-rule pt-lg font-ui text-small text-ink-muted">
          {aside}
        </div>
      )}
    </>
  );

  return (
    <>
      <PageHeader mark title={title} lead={lead} />

      {surface === "sunk" ? (
        <Band tone="sunk">
          <Container>
            {/* Sin `Section`: su `py-3xl` pelearía con este ritmo y ganaría la
                hoja, no la clase del llamado (`cn` no resuelve conflictos). */}
            <div className="py-lg lg:py-xl">{body}</div>
          </Container>
        </Band>
      ) : (
        <Container>
          <Section>{body}</Section>
        </Container>
      )}
    </>
  );
}
