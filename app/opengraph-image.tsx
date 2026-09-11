import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { site } from "@/content";

/**
 * La imagen que se ve cuando alguien pega el enlace en WhatsApp.
 *
 * Es la pieza de diseño más vista del proyecto y la que menos se revisa: la
 * mayoría de la gente va a ver esto antes que la página. Por eso se genera con la
 * tipografía real del sitio y no con la que traiga el motor por defecto.
 *
 * Sin foto de Norma, la imagen es tipográfica. Es la misma decisión que en el
 * resto del sitio: mientras no haya una foto real, no se pone una genérica. Una
 * composición tipográfica sobria en el papel del sitio se lee como intención;
 * una silueta de stock, como relleno.
 *
 * El texto es corto por necesidad, no por estilo: WhatsApp recorta la vista previa
 * y la muestra chica. Un párrafo acá es ilegible.
 */

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Los mismos valores de `app/globals.css`, en hexadecimal: Satori no resuelve oklch. */
const PAPER = "#fbf9f5";
const INK = "#231c17";
const INK_MUTED = "#75695f";
const BRICK = "#a4522f";
const RULE = "#dfd8d0";

async function loadFont(fileName: string): Promise<ArrayBuffer> {
  const buffer = await readFile(join(process.cwd(), "assets", "fonts", fileName));

  return Uint8Array.from(buffer).buffer;
}

export default async function OpenGraphImage() {
  const [newsreader, archivo] = await Promise.all([
    loadFont("Newsreader-Regular.ttf"),
    loadFont("Archivo-Medium.ttf"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: PAPER,
        padding: "72px 80px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "Archivo",
            fontSize: 24,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: INK_MUTED,
          }}
        >
          {`${site.place.locality}, ${site.place.province}`}
        </div>

        {/* La barra de acento es el único elemento no tipográfico, y mide 4 px:
              es la misma regla que separa las secciones del sitio, engrosada. */}
        <div
          style={{
            width: 96,
            height: 4,
            backgroundColor: BRICK,
            marginTop: 28,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "Newsreader",
            fontSize: 108,
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
            fontSize: 44,
            lineHeight: 1.25,
            color: INK_MUTED,
            marginTop: 28,
          }}
        >
          {site.tagline}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${RULE}`,
          paddingTop: 28,
          fontFamily: "Archivo",
          fontSize: 26,
          color: INK_MUTED,
        }}
      >
        Aportes y rendición de cuentas publicada
      </div>
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
