import { describe, expect, it } from "vitest";

import { getContent } from "@/content";

import { previewPhotoFor } from "./preview-photo";

const DESTINOS = [
  "/que-paso",
  "/reconstruccion",
  "/norma",
  "/legado",
  "/ayudar",
  "/catalogo",
  "/quienes-ayudaron",
  "/novedades",
] as const;

describe("previewPhotoFor", () => {
  it("cada destino de previa tiene una foto real, en los dos idiomas", () => {
    for (const locale of ["es", "en"] as const) {
      for (const href of DESTINOS) {
        const photo = previewPhotoFor(href, locale);

        expect(photo, `${href} (${locale})`).not.toBeNull();
        expect(photo?.url.startsWith("/fotos/"), `${href} usa una foto del repo`).toBe(
          true,
        );
      }
    }
  });

  it("las preguntas de la home apuntan a destinos con foto", () => {
    for (const locale of ["es", "en"] as const) {
      const { faq } = getContent(locale);

      for (const item of faq) {
        if (item.href === null) {
          continue;
        }

        expect(
          previewPhotoFor(item.href, locale),
          `${item.href} (${locale})`,
        ).not.toBeNull();
      }
    }
  });

  it("un destino sin tramo no inventa una foto", () => {
    expect(previewPhotoFor("/contacto", "es")).toBeNull();
  });
});
