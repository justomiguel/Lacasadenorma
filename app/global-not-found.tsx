import type { Metadata } from "next";

import { NotFoundScreen } from "@/components/screens/not-found-screen";
import { PublicDocument } from "@/components/site/public-document";
import { getContent } from "@/content";

/**
 * 404 de una URL que no calza ningún root layout.
 *
 * El castellano no lleva prefijo (ADR-023), así que `/lo-que-sea` no entra a
 * `app/(es)/not-found.tsx`. Este archivo es el documento completo —incluye
 * `<html>`— porque Next se salta los layouts. El inglés no pasa por acá: un
 * catch-all bajo `/en` dispara `notFound()` y usa el 404 de ese árbol.
 */
const { ui } = getContent("es");

export const metadata: Metadata = {
  title: ui.notFoundPage.title,
  description: ui.notFoundPage.lead,
};

export default function GlobalNotFound() {
  return (
    <PublicDocument locale="es">
      <NotFoundScreen locale="es" />
    </PublicDocument>
  );
}
