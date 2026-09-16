"use client";

import Image from "next/image";

import { BrandLabel } from "@/components/design-system/brand-mark";
import { cn } from "@/components/design-system/cn";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import { MailIcon, PhoneIcon } from "@/components/design-system/icons";
import type { Photograph } from "@/components/design-system/photo";
import { track } from "@/src/infrastructure/analytics/browser";

/**
 * Cómo escribirle a Justo.
 *
 * WhatsApp es la vía que la familia usa y la única con forma de botón; llamar,
 * el correo e Instagram son enlaces de texto con su marca al lado. El retrato es
 * chico y rectangular: no es un avatar de aplicación, es la foto de una persona.
 */
const TEXT_ACTION =
  "inline-flex min-h-touch items-center gap-xs font-ui text-body font-medium text-forest transition-colors duration-fast hover:text-forest-strong";

export function ContactActions({
  name,
  photo,
  phoneDisplay,
  phoneTel,
  email,
  instagram,
  whatsappLabel,
  callLabel,
  emailLabel,
  instagramLabel,
  origen,
}: {
  name: string;
  photo: Photograph;
  phoneDisplay: string;
  phoneTel: string;
  email: string;
  instagram: string;
  whatsappLabel: string;
  callLabel: string;
  emailLabel: string;
  instagramLabel: string;
  origen: string;
}) {
  const digits = phoneTel.replace("+", "");
  const whatsapp = `https://wa.me/${digits}`;
  const tel = `tel:${phoneTel}`;
  const mail = `mailto:${email}`;
  const instagramHref = `https://www.instagram.com/${instagram}/`;

  return (
    <div>
      <div className="flex items-center gap-md">
        <Image
          src={photo.url}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes="64px"
          className="h-16 w-14 shrink-0 rounded-sm object-cover object-top"
        />
        <div>
          <p className="font-ui text-body font-medium">{name}</p>
          <p className="mt-3xs font-ui text-small text-ink-muted" data-figure>
            {phoneDisplay}
          </p>
        </div>
      </div>
      <div className="mt-lg flex flex-col items-start gap-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-xl">
        <a
          href={whatsapp}
          rel="noopener noreferrer"
          target="_blank"
          className="inline-flex min-h-12 items-center gap-xs rounded-md bg-forest px-lg font-ui text-body font-medium text-paper transition-colors duration-fast hover:bg-forest-strong active:translate-y-px"
          onClick={() => {
            track({ name: "whatsapp_click", props: { origen } });
          }}
        >
          <BrandLabel id="whatsapp">{whatsappLabel}</BrandLabel>
        </a>
        <a
          href={tel}
          className={TEXT_ACTION}
          onClick={() => {
            track({ name: "llamar_click", props: { origen } });
          }}
        >
          <IdentifyingMark data-contact-mark="tel" className="text-olive">
            <PhoneIcon />
          </IdentifyingMark>
          {callLabel}
        </a>
        <a href={mail} className={TEXT_ACTION}>
          <IdentifyingMark data-contact-mark="mail" className="text-olive">
            <MailIcon />
          </IdentifyingMark>
          {emailLabel}
        </a>
        <a
          href={instagramHref}
          rel="noopener noreferrer"
          target="_blank"
          className={cn(TEXT_ACTION)}
        >
          <BrandLabel id="instagram">{instagramLabel}</BrandLabel>
        </a>
      </div>
    </div>
  );
}
