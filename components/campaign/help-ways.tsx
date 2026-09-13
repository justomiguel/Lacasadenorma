import { ContactActions } from "@/components/campaign/contact-actions";
import type { HelpContent, UiContent } from "@/content/schema";

/**
 * Las tres formas de ayudar del mockup: 01 escombros, 02 materiales, 03 aporte.
 * Escritorio en columnas; teléfono en filas. No es una grilla de cards genérica.
 */
export function HelpWays({
  help,
  ui,
  origen,
  remoteHref,
}: {
  help: HelpContent;
  ui: UiContent;
  origen: "home" | "ayudar";
  remoteHref: string;
}) {
  return (
    <div className="mt-2xl grid md:grid-cols-3 md:gap-lg">
      <article className="border-b border-rule py-xl md:rounded-md md:border md:border-rule md:bg-paper md:p-lg md:shadow-card">
        <p className="font-ui text-label text-olive">01</p>
        <h3 className="mt-xs font-display text-heading">{ui.home.debrisTitle}</h3>
        <p className="mt-md text-body text-ink-muted">{ui.home.debrisBody}</p>
        <div className="mt-lg">
          <ContactActions
            name={help.contact.name}
            phoneDisplay={help.contact.phoneDisplay}
            phoneTel={help.contact.phoneTel}
            whatsappLabel={ui.home.whatsapp}
            callLabel={ui.home.call}
            origen={`${origen}-escombros`}
          />
        </div>
      </article>

      <article className="border-b border-rule py-xl md:rounded-md md:border md:border-rule md:bg-paper md:p-lg md:shadow-card">
        <p className="font-ui text-label text-olive">02</p>
        <h3 className="mt-xs font-display text-heading">{ui.home.materialsTitle}</h3>
        <p className="mt-md text-body text-ink-muted">{ui.home.materialsBody}</p>
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
      </article>

      <article className="py-xl md:rounded-md md:bg-forest md:p-lg md:text-paper">
        <p className="font-ui text-label text-olive md:text-sage">03</p>
        <h3 className="mt-xs font-display text-heading">{ui.home.remoteTitle}</h3>
        <p className="mt-md text-body md:text-paper">{ui.home.remoteBody}</p>
        <p className="mt-lg">
          <a
            href={remoteHref}
            className="lift-hover inline-flex min-h-touch items-center rounded-pill bg-sage px-lg font-ui text-small font-medium text-forest"
          >
            {ui.helpCta} →
          </a>
        </p>
      </article>
    </div>
  );
}
