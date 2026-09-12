import { InPageAction } from "@/components/design-system/actions";
import { BleedOnMobile, ReservedSpace } from "@/components/design-system/photo";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

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
 * 5. **La apertura dice qué pasó, no qué nos proponemos.** Acá estaba la frase del
 *    proyecto —«Reconstruimos una casa. Construimos un legado.»—, que sigue siendo
 *    cierta y sigue en el pie y en la tarjeta social, pero no informa: quien llega
 *    de un WhatsApp no sabe todavía qué casa ni por qué. Ahora las dos primeras
 *    frases son el hecho y la necesidad, y con eso la apertura responde las cinco
 *    preguntas de ADR-024 §5 sin pedirle nada al visitante.
 * 6. **Compartir está en la apertura.** Era la quinta pregunta y sólo se podía
 *    contestar bajando catorce pantallas. Es la acción que más veces se ejecuta,
 *    porque casi todo el mundo llega acá porque alguien le pasó el enlace.
 */
export function Hero({ locale }: { locale: Locale }) {
  const { norma, site, ui } = getContent(locale);

  return (
    <section className="border-b border-rule" aria-labelledby="apertura">
      <div className="mx-auto grid w-full max-w-page items-center gap-2xl px-5 pb-3xl pt-2xl sm:px-xl lg:grid-cols-12 lg:gap-lg lg:px-4xl lg:pb-4xl">
        <div className="lg:col-span-6">
          <h1 id="apertura" className="font-display text-display">
            {site.name}
          </h1>

          <p className="mt-lg max-w-measure font-prose text-lead text-ink">
            {ui.home.openingLead}
          </p>

          <div className="mt-xl flex flex-col items-start gap-lg sm:flex-row sm:items-center">
            <HelpCta
              origen="apertura"
              href={localizedHref("/ayudar", locale)}
              label={ui.helpCta}
            />
            <InPageAction fragment="compartir">{ui.home.shareOpening}</InPageAction>
          </div>

          {/* Debajo de las acciones, y no arriba: en 360 px cada línea que se mete
              antes del botón lo empuja hacia el pliegue, y SC-001 mide justamente
              eso. Quien lee dos frases sigue leyendo la tercera. */}
          <p className="mt-xl max-w-measure text-body text-ink-muted">
            {ui.home.openingNeed}
          </p>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          {norma.portrait === null ? (
            <ReservedSpace ratio="portrait" description={ui.home.portraitReserved} />
          ) : (
            /* Sangra al ancho del teléfono. Es la única foto de la apertura y en
               360 px la diferencia entre una columna de 320 px y el borde de la
               pantalla es la diferencia entre ilustrar el título y abrir con ella. */
            <BleedOnMobile
              media={{
                ...norma.portrait,
                caption: `${norma.fullName}. ${site.place.locality}, ${site.place.province}.`,
              }}
              priority
              sizes="(min-width: 64rem) 40vw, 100vw"
            />
          )}
        </div>
      </div>
    </section>
  );
}
