"use client";

import { track } from "@/src/infrastructure/analytics/browser";

export function ContactActions({
  name,
  phoneDisplay,
  phoneTel,
  whatsappLabel,
  callLabel,
  origen,
}: {
  name: string;
  phoneDisplay: string;
  phoneTel: string;
  whatsappLabel: string;
  callLabel: string;
  origen: string;
}) {
  const digits = phoneTel.replace("+", "");
  const whatsapp = `https://wa.me/${digits}`;
  const tel = `tel:${phoneTel}`;

  return (
    <div>
      <p className="font-ui text-small text-ink-muted">{name}</p>
      <p className="mt-3xs font-ui text-subheading font-medium">{phoneDisplay}</p>
      <div className="mt-md flex flex-wrap gap-sm">
        <a
          href={whatsapp}
          rel="noopener noreferrer"
          target="_blank"
          className="lift-hover inline-flex min-h-touch items-center rounded-pill bg-forest px-lg font-ui text-small font-medium text-paper"
          onClick={() => {
            track({ name: "whatsapp_click", props: { origen } });
          }}
        >
          {whatsappLabel}
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
      </div>
    </div>
  );
}
