"use client";

import { ContactActions } from "@/components/campaign/contact-actions";
import { DonationBoard } from "@/components/campaign/donation-board";
import { SectionTabs } from "@/components/design-system/tabs";
import type { HelpContent, UiContent } from "@/content/schema";

/**
 * Las tres formas de ayudar, como pestañas de un solo capítulo.
 *
 * Antes eran dos secciones seguidas —tres tarjetas y, debajo, el tablero de
 * donaciones— y la tercera tarjeta era un botón que bajaba a la sección
 * siguiente. Quien llegaba veía dos veces «cómo ayudar» y no sabía si eran la
 * misma cosa. Son la misma cosa: una decisión con tres respuestas. Las pestañas
 * la muestran así, y la primera abierta es la que más gente necesita, el aporte.
 *
 * Cada panel se sostiene solo, con su contacto adentro, porque quien elige
 * «dar una mano» no tiene que ir a buscar el WhatsApp a otra pestaña.
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
            <div>
              <h3 className="font-display text-card">{ui.home.donateTitle}</h3>
              <p className="mt-sm max-w-measure text-body text-ink-muted">
                {ui.home.donateLead}
              </p>
              <DonationBoard help={help} ui={ui} className="mt-xl" />
              <p className="mt-xl max-w-measure font-hand text-hand text-olive">
                {ui.home.thanksNote}
              </p>
            </div>
          ),
        },
        {
          id: "terreno",
          label: ui.home.tabHands,
          content: (
            <div className="grid gap-xl lg:grid-cols-12">
              <div className="lg:col-span-6">
                <h3 className="font-display text-card">{ui.home.debrisTitle}</h3>
                <p className="mt-sm max-w-measure text-body text-ink-muted">
                  {ui.home.debrisBody}
                </p>
              </div>
              <div className="lg:col-span-5 lg:col-start-8">{contact("escombros")}</div>
            </div>
          ),
        },
        {
          id: "materiales",
          label: ui.home.tabMaterials,
          content: (
            <div className="grid gap-xl lg:grid-cols-12">
              <div className="lg:col-span-6">
                <h3 className="font-display text-card">{ui.home.materialsTitle}</h3>
                <p className="mt-sm max-w-measure text-body text-ink-muted">
                  {ui.home.materialsBody}
                </p>
                <ul className="mt-md flex flex-wrap gap-xs">
                  {help.materials.map((item) => (
                    <li
                      key={item}
                      className="rounded-pill bg-sage px-md py-xs font-ui text-small text-forest"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-5 lg:col-start-8">
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
