import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getContent } from "@/content";
import type { Locale } from "@/src/i18n/locale";

/**
 * La imagen que se ve cuando alguien pega el enlace en WhatsApp.
 *
 * El texto sale del paquete del idioma. Las dos rutas (castellano e inglés)
 * llaman a esta función: no hay dos composiciones.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * Los tokens, a mano y en hexadecimal.
 *
 * `next/og` no evalúa CSS del proyecto: esta imagen se compone con estilos en
 * línea, así que la paleta se copia. Son los mismos valores de `globals.css`
 * convertidos de oklch a sRGB, y hay que actualizarlos acá cuando cambien allá.
 * `revision-visual.spec.ts` mira el sitio, no esta imagen.
 */
const PAPER = "#f7fbfb";
const INK = "#0c1b1e";
const INK_MUTED = "#4e5e62";
const AQUA = "#176b6b";
const RULE = "#ccd6d7";

async function loadFont(fileName: string): Promise<ArrayBuffer> {
  const buffer = await readFile(join(process.cwd(), "assets", "fonts", fileName));

  return Uint8Array.from(buffer).buffer;
}

async function loadPhoto(url: string): Promise<string> {
  const buffer = await readFile(join(process.cwd(), "public", url));

  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

function photoWidth(photo: { width: number; height: number }): number {
  return Math.round((size.height * photo.width) / photo.height);
}

export function openGraphAlt(locale: Locale): string {
  const { site } = getContent(locale);
  return `${site.name} — ${site.tagline}`;
}

export async function renderOpenGraphImage(locale: Locale): Promise<ImageResponse> {
  const { norma, site, ui } = getContent(locale);

  const [newsreader, archivo, portrait] = await Promise.all([
    loadFont("Newsreader-Regular.ttf"),
    loadFont("Archivo-Medium.ttf"),
    norma.portrait === null ? Promise.resolve(null) : loadPhoto(norma.portrait.url),
  ]);

  const photo = norma.portrait === null ? 0 : photoWidth(norma.portrait);

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: PAPER,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: size.width - photo,
          height: "100%",
          padding: "68px 64px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Archivo",
              fontSize: 26,
              color: INK_MUTED,
            }}
          >
            {`${site.place.locality}, ${site.place.province}`}
          </div>
          <div
            style={{
              width: 96,
              height: 4,
              backgroundColor: AQUA,
              marginTop: 24,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Archivo y no Newsreader: el nombre del proyecto es la voz del sitio, y
              desde ADR-024 esa voz es la grotesca. La bajada se queda en serif,
              porque es la voz de quien cuenta. */}
          <div
            style={{
              fontFamily: "Archivo",
              fontSize: 88,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: INK,
            }}
          >
            {site.name}
          </div>
          <div
            style={{
              fontFamily: "Newsreader",
              fontSize: 38,
              lineHeight: 1.25,
              color: INK_MUTED,
              marginTop: 24,
            }}
          >
            {site.tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            borderTop: `1px solid ${RULE}`,
            paddingTop: 24,
            fontFamily: "Archivo",
            fontSize: 24,
            color: INK_MUTED,
          }}
        >
          {ui.ogCardFooter}
        </div>
      </div>

      {portrait === null ? null : (
        <img
          src={portrait}
          width={photo}
          height={size.height}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: photo,
            height: size.height,
            objectFit: "cover",
          }}
          alt=""
        />
      )}
    </div>,
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: newsreader, weight: 400, style: "normal" },
        { name: "Archivo", data: archivo, weight: 500, style: "normal" },
      ],
    },
  );
}
