"use client";

import Image from "next/image";

import { BrandLabel } from "@/components/design-system/brand-mark";
import type { Photograph } from "@/components/design-system/photo";
import { track } from "@/src/infrastructure/analytics/browser";

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
          sizes="80px"
          className="size-20 shrink-0 rounded-full object-cover object-top"
        />
        <div>
          <p className="font-ui text-small text-ink-muted">{name}</p>
          <p className="mt-3xs font-ui text-subheading font-medium">{phoneDisplay}</p>
        </div>
      </div>
      <div className="mt-md flex flex-wrap gap-sm">
        <a
          href={whatsapp}
          rel="noopener noreferrer"
          target="_blank"
          className="lift-hover inline-flex min-h-touch items-center gap-xs rounded-pill bg-forest px-lg font-ui text-small font-medium text-paper"
          onClick={() => {
            track({ name: "whatsapp_click", props: { origen } });
          }}
        >
          <BrandLabel id="whatsapp">{whatsappLabel}</BrandLabel>
        </a>
        <a
          href={tel}
          className="lift-hover inline-flex min-h-touch items-center rounded-pill border border-forest px-lg font-ui text-small font-medium text-forest"
          onClick={() => {
            track({ name: "llamar_click", props: { origen } });
          }}
        >
          {callLabel}
        </a>
        <a
          href={mail}
          className="lift-hover inline-flex min-h-touch items-center rounded-pill border border-forest px-lg font-ui text-small font-medium text-forest"
        >
          {emailLabel}
        </a>
        <a
          href={instagramHref}
          rel="noopener noreferrer"
          target="_blank"
          className="lift-hover inline-flex min-h-touch items-center gap-xs rounded-pill border border-forest px-lg font-ui text-small font-medium text-forest"
        >
          <BrandLabel id="instagram">{instagramLabel}</BrandLabel>
        </a>
      </div>
    </div>
  );
}
