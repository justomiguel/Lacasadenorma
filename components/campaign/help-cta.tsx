"use client";

import { PrimaryAction } from "@/components/design-system/actions";
import { track } from "@/src/infrastructure/analytics/browser";

/**
 * La acción de ayudar, con el evento de analítica.
 *
 * Es cliente sólo por el evento. Sigue siendo un `<a>` real en el HTML servido,
 * así que funciona antes de que llegue el JavaScript y funciona si no llega: el
 * evento se pierde, el enlace no. Es el orden de prioridades correcto.
 *
 * `origen` dice desde qué parte de la página se tocó. Sin eso no se puede saber
 * si la apertura convence o si la gente decide recién al final, que es la única
 * pregunta que la analítica tiene que poder responder acá.
 */
export function HelpCta({
  origen,
  label = "Ayudar a reconstruir",
  className,
}: {
  origen: string;
  label?: string;
  className?: string;
}) {
  return (
    <PrimaryAction
      href="/ayudar"
      onClick={() => {
        track({ name: "ayudar_click", props: { origen } });
      }}
      {...(className === undefined ? {} : { className })}
    >
      {label}
    </PrimaryAction>
  );
}
