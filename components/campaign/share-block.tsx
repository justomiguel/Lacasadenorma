"use client";

import { ShareRow } from "@/components/design-system/share-row";
import { track } from "@/src/infrastructure/analytics/browser";

/**
 * Compartir, con el evento de analítica.
 *
 * Compartir es la vía real de difusión de este proyecto: la mayoría va a llegar
 * desde un mensaje de WhatsApp reenviado, no desde un buscador. Por eso el
 * canal se registra —para saber por dónde circula— y por eso los enlaces
 * existen en el HTML servido, sin depender de `navigator.share`.
 */
export function ShareBlock({
  url,
  route,
  title,
  text,
  className,
}: {
  url: string;
  /** Ruta del sitio, no la URL completa: el evento no necesita el dominio. */
  route: string;
  title: string;
  text: string;
  className?: string;
}) {
  return (
    <ShareRow
      url={url}
      title={title}
      text={text}
      onShared={(canal) => {
        track({ name: "compartir", props: { canal, ruta: route } });
      }}
      {...(className === undefined ? {} : { className })}
    />
  );
}
