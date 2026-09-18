"use client";

import { ErrorScreen } from "@/components/site/error-screen";
import { caveat, inter, playfair, playfairItalic } from "@/app/fonts";
import "@/app/globals.css";

/**
 * Error del documento raíz. Next se salta los layouts, así que acá está el
 * `<html>` (ADR-053). El castellano es el idioma por defecto del sitio.
 */
const copy = {
  title: "Esto no se pudo completar",
  lead: "Pasó algo que el sitio no pudo resolver. El detalle quedó en el registro del servidor.",
  retry: "Intentar de nuevo",
  home: "Volver al inicio",
  stackLabel: "Detalle técnico",
  close: "Cerrar",
};

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html
      lang="es-AR"
      className={`${playfair.variable} ${playfairItalic.variable} ${inter.variable} ${caveat.variable}`}
    >
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <ErrorScreen error={error} retry={retry} copy={copy} homeHref="/" />
      </body>
    </html>
  );
}
