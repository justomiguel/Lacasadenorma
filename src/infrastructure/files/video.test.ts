import { describe, expect, it } from "vitest";

import { UnsupportedFileError } from "./image";
import {
  inspectVideo,
  MAX_VIDEO_BYTES,
  sniffVideoType,
  VIDEO_DISPLAY_HEIGHT,
  VIDEO_DISPLAY_WIDTH,
  videoStorageKey,
} from "./video";

/** Encabezado mínimo de un MP4: caja `ftyp` con marca `isom`. */
function mp4Bytes(): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);

  view.setUint32(0, 24, false);
  bytes.set([0x66, 0x74, 0x79, 0x70], 4);
  bytes.set([0x69, 0x73, 0x6f, 0x6d], 8);

  return bytes;
}

/** Encabezado EBML de un WebM. */
function webmBytes(): Uint8Array {
  return new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00]);
}

function fileOf(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes as unknown as BlobPart], name, { type });
}

describe("sniffVideoType", () => {
  it("reconoce MP4 y WebM por su firma", () => {
    expect(sniffVideoType(mp4Bytes())).toBe("video/mp4");
    expect(sniffVideoType(webmBytes())).toBe("video/webm");
  });

  it("no confunde un AVIF con un MP4: los dos son ISOBMFF", () => {
    const avif = new Uint8Array(32);
    const view = new DataView(avif.buffer);

    view.setUint32(0, 24, false);
    avif.set([0x66, 0x74, 0x79, 0x70], 4);
    avif.set([0x61, 0x76, 0x69, 0x66], 8);

    expect(sniffVideoType(avif)).toBeNull();
  });

  it("no reconoce un SVG ni un HTML disfrazados de video", () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );

    expect(sniffVideoType(svg)).toBeNull();
    expect(sniffVideoType(new TextEncoder().encode("<!doctype html>"))).toBeNull();
  });
});

describe("inspectVideo", () => {
  it("acepta un MP4 y reserva el marco 16:9", async () => {
    const info = await inspectVideo(fileOf(mp4Bytes(), "obra.mp4", "video/mp4"));

    expect(info).toEqual({
      mimeType: "video/mp4",
      width: VIDEO_DISPLAY_WIDTH,
      height: VIDEO_DISPLAY_HEIGHT,
    });
  });

  it("acepta un WebM", async () => {
    const info = await inspectVideo(fileOf(webmBytes(), "obra.webm", "video/webm"));

    expect(info.mimeType).toBe("video/webm");
  });

  it("rechaza un SVG renombrado a .mp4 y declarado como video/mp4", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );

    await expect(inspectVideo(fileOf(svg, "obra.mp4", "video/mp4"))).rejects.toThrow(
      UnsupportedFileError,
    );
  });

  it("rechaza un archivo vacío", async () => {
    await expect(
      inspectVideo(fileOf(new Uint8Array(0), "vacio.mp4", "video/mp4")),
    ).rejects.toThrow(/vacío/);
  });

  it("rechaza un archivo más grande que el máximo", async () => {
    const big = new File(["x".repeat(MAX_VIDEO_BYTES + 1)], "grande.mp4", {
      type: "video/mp4",
    });

    await expect(inspectVideo(big)).rejects.toThrow(/pesa más de/);
  });
});

describe("videoStorageKey", () => {
  it("genera una ruta con fecha y extensión, sin el nombre original", () => {
    const key = videoStorageKey("video/mp4", new Date("2026-09-14T12:00:00Z"));

    expect(key).toMatch(/^2026-09-14\/[0-9a-f-]{36}\.mp4$/);
  });
});
