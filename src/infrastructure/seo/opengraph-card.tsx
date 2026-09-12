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
 * Los tokens, a mano y en hexadecimal. `next/og` no evalúa CSS del proyecto.
 */
const PAPER = "#f6f1e8";
const INK = "#1c1c1c";
const INK_MUTED = "#5c5f56";
const FOREST = "#153a2e";
const RULE = "#d4cfc0";

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
  const { site, ui, whatHappened } = getContent(locale);
  const fire =
    whatHappened.photoEssay[1]?.photos[0] ?? whatHappened.photoEssay[0]?.photos[0];

  const [playfair, inter, portrait] = await Promise.all([
    loadFont("PlayfairDisplay-Regular.woff"),
    loadFont("Inter-Medium.woff"),
    fire === undefined ? Promise.resolve(null) : loadPhoto(fire.url),
  ]);

  const photo = fire === undefined ? 0 : photoWidth(fire);

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
              fontFamily: "Inter",
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
              backgroundColor: FOREST,
              marginTop: 24,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Playfair",
              fontSize: 80,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: INK,
            }}
          >
            {site.name}
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 32,
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
            fontFamily: "Inter",
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
        { name: "Playfair", data: playfair, weight: 400, style: "normal" },
        { name: "Inter", data: inter, weight: 500, style: "normal" },
      ],
    },
  );
}
