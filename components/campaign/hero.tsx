import { SecondaryAction } from "@/components/design-system/actions";
import { Figure, ReservedSpace } from "@/components/design-system/photo";
import { norma, site } from "@/content";

import { HelpCta } from "./help-cta";

/**
 * La apertura.
 *
 * Cuatro decisiones que vale la pena que queden escritas, porque las cuatro se
 * podrían "arreglar" mal más adelante:
 *
 * 1. **El texto va antes de la foto en el orden del documento.** En 360 px —el
 *    ancho de quien llega de un WhatsApp— un retrato en proporción 4:5 ocupa la
 *    pantalla entera y empujaría el nombre y la acción abajo del pliegue, que es
 *    exactamente lo que SC-001 prohíbe. En desktop la composición se vuelve
 *    asimétrica y la foto recupera su peso.
 * 2. **Hay una sola acción con forma de botón.** La segunda es un enlace de
 *    texto con regla: dos botones compitiendo diluyen la decisión.
 * 3. **El lugar no es una sobrelínea en versales.** Estaba arriba del título, en
 *    versales espaciadas, y era el primero de los 39 casos del patrón que hacía que
 *    el sitio se leyera como una plantilla (ADR-021). Ahora el lugar viaja con el
 *    nombre de Norma, en el epígrafe de su foto, que es donde informa.
 * 4. **La foto es ella, y se dice quién es.** El sitio se llama La Casa de Norma y
 *    durante mucho tiempo abrió con un rectángulo gris que decía que la familia
 *    estaba eligiendo la fotografía. El epígrafe lleva su nombre completo porque el
 *    título de la página dice "Norma" y su nombre era Norma Edith Bedoya.
 */
export function Hero() {
  return (
    <section className="border-b border-rule" aria-labelledby="apertura">
      <div className="mx-auto grid w-full max-w-page items-center gap-2xl px-5 pb-3xl pt-2xl sm:px-xl lg:grid-cols-12 lg:gap-lg lg:px-4xl lg:pb-4xl">
        <div className="lg:col-span-6">
          <h1 id="apertura" className="font-prose text-display">
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
          {norma.portrait === null ? (
            <ReservedSpace
              ratio="portrait"
              description="Acá va un retrato de Norma. Su familia está eligiendo la fotografía."
            />
          ) : (
            <Figure
              media={{
                ...norma.portrait,
                caption: `${norma.fullName}. ${site.place.locality}, ${site.place.province}.`,
              }}
              reservedFor=""
              priority
              sizes="(min-width: 64rem) 40vw, 100vw"
            />
          )}
        </div>
      </div>
    </section>
  );
}
