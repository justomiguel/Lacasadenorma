"use client";

import Link from "next/link";

import { cn } from "@/components/design-system/cn";
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
 *
 * `fragment` es para quedarse en la misma página (el scroll del mockup). No se
 * puede pasar por `Link`: con `typedRoutes` un hash no es una ruta.
 *
 * `tone="sage"` es el CTA del hero sobre la foto oscura. `cn` no resuelve
 * conflictos de Tailwind, así que el tono no se mezcla con otra clase de fondo.
 */

const BASE =
  "lift-hover inline-flex min-h-touch items-center justify-center rounded-pill px-lg py-sm font-ui text-subheading font-medium";

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
  tone?: "forest" | "sage";
  className?: string;
}) {
  const resolved = cn(
    BASE,
    tone === "sage"
      ? "bg-sage text-forest hover:bg-paper"
      : "bg-forest text-paper hover:bg-forest-strong",
    className,
  );

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
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} data-help-primary="" className={resolved} onClick={onClick}>
      {label}
    </Link>
  );
}
