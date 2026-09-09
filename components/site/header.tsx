import Link from "next/link";

import { site } from "@/content";
import { Container } from "@/components/design-system/layout";

/**
 * Encabezado mínimo: el nombre del proyecto y la acción de ayudar.
 *
 * **Sin menú hamburguesa.** En un sitio de nueve páginas, un menú oculto agrega
 * un toque y JavaScript sin dar nada; la navegación completa vive en el pie, que
 * es donde alguien la busca cuando terminó de leer.
 */
export function SiteHeader() {
  return (
    <Container as="header" className="flex items-baseline justify-between gap-md py-lg">
      <Link
        href="/"
        className="font-prose text-subheading font-medium tracking-tight text-ink"
      >
        {site.name}
      </Link>

      <Link
        href="/ayudar"
        className="inline-flex min-h-touch items-center font-ui text-small font-medium uppercase tracking-label text-brick underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-brick-strong"
      >
        Ayudar
      </Link>
    </Container>
  );
}
