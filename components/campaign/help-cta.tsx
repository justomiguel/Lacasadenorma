"use client";

import Link from "next/link";

import {
  HelpActionLabel,
  primaryActionClass,
  type ActionTone,
} from "@/components/design-system/actions";
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
 * `fragment` es para quedarse en la misma página. No se puede pasar por `Link`:
 * con `typedRoutes` un hash no es una ruta.
 *
 * `tone="paper"` es el CTA sobre la foto oscura de la apertura.
 */
export function HelpCta({
  origen,
  label = "Ayudar a reconstruir",
  href = localizedHref("/ayudar", "es"),
  fragment,
  tone = "forest",
  className,
}: {
  origen: string;
  label?: string;
  href?: ReturnType<typeof localizedHref>;
  fragment?: string;
  tone?: ActionTone;
  className?: string;
}) {
  const resolved = primaryActionClass(tone, className);

  const onClick = () => {
    track({ name: "ayudar_click", props: { origen } });
  };

  if (fragment !== undefined) {
    return (
      <a
        href={`#${fragment}`}
        data-help-primary=""
        className={resolved}
        onClick={onClick}
        {...(tone === "paper" ? { "data-tone": "paper" as const } : {})}
      >
        <HelpActionLabel>{label}</HelpActionLabel>
      </a>
    );
  }

  return (
    <Link
      href={href}
      data-help-primary=""
      className={resolved}
      onClick={onClick}
      {...(tone === "paper" ? { "data-tone": "paper" as const } : {})}
    >
      <HelpActionLabel>{label}</HelpActionLabel>
    </Link>
  );
}
