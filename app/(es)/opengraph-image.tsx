import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { norma, site } from "@/content";

/**
 * La imagen que se ve cuando alguien pega el enlace en WhatsApp.
 *
 * Es la pieza de diseño más vista del proyecto y la que menos se revisa: la
 * mayoría de la gente va a ver esto antes que la página. Por eso se genera con la
 * tipografía real del sitio y no con la que traiga el motor por defecto.
 *
 * Lleva el retrato de Norma. Durante un tiempo fue puramente tipográfica, y la
 * razón estaba escrita acá: mientras no hubiera una foto real, no se ponía una
 * genérica. Ahora la foto existe, así que la premisa venció. Lo que decide una
 * donación en el teléfono de otra persona es una cara, no un logotipo, y la
 * miniatura de WhatsApp es el único diseño del proyecto que se ve **antes** de
 * decidir si vale la pena abrir el enlace.
 *
 * Si `norma.portrait` fuera `null`, la composición vuelve a ser tipográfica sola.
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

/**
 * La foto va incrustada como data URI. Satori no sale a la red a buscar rutas
 * relativas, y depender de que el propio sitio esté servido para poder generar su
 * vista previa es una dependencia circular esperando el peor momento.
 */
async function loadPhoto(url: string): Promise<string> {
  const buffer = await readFile(join(process.cwd(), "public", url));

  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

/**
 * El ancho de la foto no es un número elegido: sale de su propia proporción, que
 * el contenido declara. Con la proporción exacta, la foto ocupa el alto completo
 * de la tarjeta sin que nada la recorte, y una cara recortada por la mitad es
 * peor que una tarjeta sin foto.
 */
function photoWidth(photo: { width: number; height: number }): number {
  return Math.round((size.height * photo.width) / photo.height);
}

export default async function OpenGraphImage() {
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

          {/* La barra de acento es el único elemento no tipográfico, y mide 4 px:
              es la misma regla que separa las secciones del sitio, engrosada. */}
          <div
            style={{
              width: 96,
              height: 4,
              backgroundColor: BRICK,
              marginTop: 24,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Newsreader",
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
          Aportes y rendición de cuentas publicada
        </div>
      </div>

      {portrait === null ? null : (
        /* Posición absoluta y no una columna del flex: en el flex la columna de
           texto le comía el ancho a la foto y el recorte se llevaba la cara. Acá el
           ancho es el que dicta la proporción declarada, y nada lo negocia. */
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
