"use client";

import { PrimaryAction } from "@/components/design-system/actions";
import { localizedHref } from "@/src/i18n/href";
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
 *
 * `data-help-primary` es lo que mira `HelpBar` para retirarse mientras esta
 * acción está en pantalla, en lugar de duplicarla (ux.md §9).
 *
 * `href` y `label` los pone la página, que es de servidor y conoce el idioma.
 * Por omisión siguen siendo el castellano, para no romper los tests que no
 * pasan locale.
 */
export function HelpCta({
  origen,
  label = "Ayudar a reconstruir",
  href = localizedHref("/ayudar", "es"),
  className,
}: {
  origen: string;
  label?: string;
  href?: ReturnType<typeof localizedHref>;
  className?: string;
}) {
  return (
    <PrimaryAction
      href={href}
      data-help-primary=""
      onClick={() => {
        track({ name: "ayudar_click", props: { origen } });
      }}
      {...(className === undefined ? {} : { className })}
    >
      {label}
    </PrimaryAction>
  );
}
