import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { DEFAULT_MARK } from "@/content/marca";

import { SHARE_CARD_SIZE, truncateForCard, type ShareCopy } from "./share-copy";

/**
 * Composición de la previa al compartir: símbolo 01 ORIGINAL y el copy de
 * esa página. Sin foto. Facebook y WhatsApp toman esta imagen (ADR-036).
 *
 * Los tokens van en hexadecimal: `next/og` no evalúa el CSS del proyecto.
 */

export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";

const PAPER = "#f6f1e8";
const INK = "#1c1c1c";
const INK_MUTED = "#4a4d44";
const RULE = "#d4cfc0";
const MARK = 160;

async function loadFont(fileName: string): Promise<ArrayBuffer> {
  const buffer = await readFile(join(process.cwd(), "assets", "fonts", fileName));

  return Uint8Array.from(buffer).buffer;
}

async function loadMark(): Promise<string> {
  const file = join(process.cwd(), "public", DEFAULT_MARK.src.replace(/^\//u, ""));
  const buffer = await readFile(file);

  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function renderShareCard(copy: ShareCopy): Promise<ImageResponse> {
  const [playfair, inter, mark] = await Promise.all([
    loadFont("PlayfairDisplay-Regular.woff"),
    loadFont("Inter-Medium.woff"),
    loadMark(),
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
        padding: "64px 72px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* next/og dibuja el PNG a mano: next/image no corre adentro de ImageResponse. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- satori */}
        <img
          src={mark}
          width={MARK}
          height={MARK}
          alt=""
          style={{ width: MARK, height: MARK }}
        />
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontFamily: "Inter",
            fontSize: 26,
            color: INK_MUTED,
          }}
        >
          {copy.kicker}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Playfair",
            fontSize: 64,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: INK,
          }}
        >
          {copy.title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontFamily: "Inter",
            fontSize: 28,
            lineHeight: 1.35,
            color: INK_MUTED,
          }}
        >
          {truncateForCard(copy.description)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 32,
          borderTop: `1px solid ${RULE}`,
          paddingTop: 24,
          fontFamily: "Inter",
          fontSize: 24,
          color: INK_MUTED,
        }}
      >
        {copy.footer}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Playfair", data: playfair, weight: 400, style: "normal" },
        { name: "Inter", data: inter, weight: 500, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
