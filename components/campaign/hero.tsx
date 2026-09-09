import { SecondaryAction } from "@/components/design-system/actions";
import { ReservedSpace } from "@/components/design-system/photo";
import { site } from "@/content";

import { HelpCta } from "./help-cta";

/**
 * La apertura.
 *
 * Tres decisiones que vale la pena que queden escritas, porque las tres se
 * podrían "arreglar" mal más adelante:
 *
 * 1. **El texto va antes de la foto en el orden del documento.** En 360 px —el
 *    ancho de quien llega de un WhatsApp— un retrato en proporción 3:4 ocupa la
 *    pantalla entera y empujaría el nombre y la acción abajo del pliegue, que es
 *    exactamente lo que SC-001 prohíbe. En desktop la composición se vuelve
 *    asimétrica y la foto recupera su peso.
 * 2. **Hay una sola acción con forma de botón.** La segunda es un enlace de
 *    texto con regla: dos botones compitiendo diluyen la decisión.
 * 3. **No hay foto todavía, y se dice.** El hueco mantiene la proporción del
 *    retrato que va a ir ahí, así que cuando llegue no hay salto de layout, y
 *    mientras tanto no hay ilustración ni imagen de archivo ocupando su lugar.
 */
export function Hero() {
  return (
    <section className="border-b border-rule" aria-labelledby="apertura">
      <div className="mx-auto grid w-full max-w-page items-end gap-2xl px-5 pb-3xl pt-2xl sm:px-xl lg:grid-cols-12 lg:gap-lg lg:px-4xl lg:pb-4xl">
        <div className="lg:col-span-6">
          <p className="font-ui text-label uppercase tracking-label text-ink-muted">
            {site.place.locality}, {site.place.province}
          </p>

          <h1 id="apertura" className="mt-md font-prose text-display">
            {site.name}
          </h1>

          <p className="mt-lg max-w-measure font-prose text-lead text-ink">
            {site.tagline}
          </p>

          <div className="mt-2xl flex flex-col items-start gap-lg sm:flex-row sm:items-center">
            <HelpCta origen="apertura" />
            <SecondaryAction href="/norma">Conocer la historia de Norma</SecondaryAction>
          </div>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <ReservedSpace
            ratio="portrait"
            description="Acá va un retrato de Norma. Su familia está eligiendo la fotografía."
          />
        </div>
      </div>
    </section>
  );
}
