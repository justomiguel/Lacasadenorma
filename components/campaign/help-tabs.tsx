"use client";

import { ContactActions } from "@/components/campaign/contact-actions";
import { DonationSelector } from "@/components/campaign/donation-selector";
import { SectionTabs } from "@/components/design-system/tabs";
import type { HelpContent, UiContent } from "@/content/schema";

/**
 * Las tres formas de ayudar, como pestañas de un solo capítulo.
 *
 * Son una sola decisión con tres respuestas: aportar, dar una mano, acercar
 * materiales. La primera abierta es la que más gente necesita. Cada panel se
 * sostiene solo, con su contacto adentro, porque quien elige «dar una mano» no
 * tiene que ir a buscar el WhatsApp a otra pestaña.
 *
 * Sin JavaScript, `SectionTabs` apila los tres paneles: se lee todo igual.
 *
 * No emite un evento al cambiar de pestaña: la lista de eventos es cerrada
 * (ADR-010) y los que ya existen —copiar un dato, tocar WhatsApp, abrir un medio
 * externo— cuentan lo que importa, que es lo que la persona hizo.
 */
export function HelpTabs({
  help,
  ui,
  origen,
  className,
}: {
  help: HelpContent;
  ui: UiContent;
  origen: "home" | "ayudar";
  className?: string;
}) {
  const contact = (suffix: string) => (
    <ContactActions
      name={help.contact.name}
      photo={help.contact.photo}
      phoneDisplay={help.contact.phoneDisplay}
      phoneTel={help.contact.phoneTel}
      email={help.contact.email}
      instagram={help.contact.instagram}
      whatsappLabel={ui.home.whatsapp}
      callLabel={ui.home.call}
      emailLabel={ui.home.email}
      instagramLabel={ui.home.instagram}
      origen={`${origen}-${suffix}`}
    />
  );

  return (
    <SectionTabs
      label={ui.home.helpTabsLabel}
      {...(className === undefined ? {} : { className })}
      items={[
        {
          id: "aporte",
          label: ui.home.tabDonate,
          content: (
            <div className="lg:grid lg:grid-cols-12 lg:gap-2xl">
              <div className="lg:col-span-4">
                <h3 className="font-display text-section-title">{ui.home.donateTitle}</h3>
                <p className="mt-sm max-w-measure text-body text-ink-muted">
                  {ui.home.donateLead}
                </p>
              </div>
              <div className="mt-xl lg:col-span-7 lg:col-start-6 lg:mt-0">
                <DonationSelector help={help} ui={ui} />
                <DonationConfirmation
                  paragraphs={help.afterTransfer}
                  note={ui.home.thanksNote}
                  className="mt-xl"
                />
              </div>
            </div>
          ),
        },
        {
          id: "terreno",
          label: ui.home.tabHands,
          content: (
            <div className="grid gap-xl lg:grid-cols-12">
              <div className="lg:col-span-5">
                <h3 className="font-display text-section-title">{ui.home.debrisTitle}</h3>
                <p className="mt-sm max-w-measure text-body text-ink-muted">
                  {ui.home.debrisBody}
                </p>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">{contact("escombros")}</div>
            </div>
          ),
        },
        {
          id: "materiales",
          label: ui.home.tabMaterials,
          content: (
            <div className="grid gap-xl lg:grid-cols-12">
              <div className="lg:col-span-5">
                <h3 className="font-display text-section-title">
                  {ui.home.materialsTitle}
                </h3>
                <p className="mt-sm max-w-measure text-body text-ink-muted">
                  {ui.home.materialsBody}
                </p>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <p className="mb-md max-w-measure text-body">
                  {ui.home.materialsContact}
                </p>
                {contact("materiales")}
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}

/**
 * Qué pasa después de aportar. No hay comprobante ni recibo que mostrar: el
 * sitio no cobra. Lo que sí se dice es que no hace falta avisar, y gracias.
 */
function DonationConfirmation({
  paragraphs,
  note,
  className,
}: {
  paragraphs: readonly string[];
  note: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {paragraphs.map((text) => (
        <p key={text.slice(0, 48)} className="max-w-measure text-small text-ink-muted">
          {text}
        </p>
      ))}
      <p className="mt-md max-w-measure font-hand text-hand text-olive">{note}</p>
    </div>
  );
}
