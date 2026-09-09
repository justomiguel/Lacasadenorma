import { describe, expect, it } from "vitest";

import {
  inspectImage,
  inspectReceipt,
  MAX_UPLOAD_BYTES,
  sniffFileType,
  storageKeyFor,
  UnsupportedFileError,
} from "./image";

/** PNG mínimo válido: firma + IHDR de 320 × 180. */
function pngBytes(width = 320, height = 180): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);

  return bytes;
}

/** JPEG con un SOF0 después de un segmento de metadatos, como sale de una cámara. */
function jpegBytes(width = 800, height = 600): Uint8Array {
  const bytes = new Uint8Array(64);
  const view = new DataView(bytes.buffer);

  bytes.set([0xff, 0xd8], 0);
  // APP0 de 16 bytes, para que el SOF no esté en un offset fijo.
  bytes.set([0xff, 0xe0], 2);
  view.setUint16(4, 16, false);
  // SOF0 en el offset 20.
  bytes.set([0xff, 0xc0], 20);
  view.setUint16(22, 17, false);
  bytes[24] = 8;
  view.setUint16(25, height, false);
  view.setUint16(27, width, false);

  return bytes;
}

function webpBytes(width = 640, height = 480): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);

  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x20], 12);
  // El bitstream de VP8 lleva las medidas en 14 bits cada una.
  view.setUint16(26, width, true);
  view.setUint16(28, height, true);

  return bytes;
}

function fileOf(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes as unknown as BlobPart], name, { type });
}

describe("sniffFileType", () => {
  it("reconoce los formatos aceptados por su firma", () => {
    expect(sniffFileType(pngBytes())).toBe("image/png");
    expect(sniffFileType(jpegBytes())).toBe("image/jpeg");
    expect(sniffFileType(webpBytes())).toBe("image/webp");
    expect(sniffFileType(new TextEncoder().encode("%PDF-1.7\n"))).toBe("application/pdf");
  });

  it("no reconoce un SVG", () => {
    // Un SVG es XML, no tiene firma binaria, y cae en el `null` por construcción.
    // No hace falta una regla que lo nombre: la lista es blanca.
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    );

    expect(sniffFileType(svg)).toBeNull();
  });

  it("no reconoce un HTML ni un ejecutable", () => {
    expect(sniffFileType(new TextEncoder().encode("<!doctype html>"))).toBeNull();
    expect(sniffFileType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });
});

describe("inspectImage", () => {
  it("devuelve el tipo real y las medidas de un PNG", async () => {
    const info = await inspectImage(fileOf(pngBytes(320, 180), "obra.png", "image/png"));

    expect(info).toEqual({ mimeType: "image/png", width: 320, height: 180 });
  });

  it("encuentra el SOF de un JPEG aunque haya metadatos antes", async () => {
    const info = await inspectImage(
      fileOf(jpegBytes(800, 600), "obra.jpg", "image/jpeg"),
    );

    expect(info).toEqual({ mimeType: "image/jpeg", width: 800, height: 600 });
  });

  it("lee las medidas de un WebP", async () => {
    const info = await inspectImage(
      fileOf(webpBytes(640, 480), "obra.webp", "image/webp"),
    );

    expect(info).toEqual({ mimeType: "image/webp", width: 640, height: 480 });
  });

  it("rechaza un SVG renombrado a .png y declarado como image/png", async () => {
    // Es la amenaza T6. Tanto la extensión como el `type` los eligió quien sube el
    // archivo: si se les creyera, un documento con `<script>` quedaría servido
    // desde el origen del sitio, con acceso a las cookies de quien abra la imagen.
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );

    await expect(inspectImage(fileOf(svg, "foto.png", "image/png"))).rejects.toThrow(
      UnsupportedFileError,
    );
  });

  it("rechaza un PDF entre las fotos", async () => {
    // El PDF es válido como comprobante y no como foto: se renderizaría con
    // `next/image`, que no lo puede mostrar.
    const pdf = new TextEncoder().encode("%PDF-1.7\n");

    await expect(
      inspectImage(fileOf(pdf, "factura.pdf", "application/pdf")),
    ).rejects.toThrow(/JPEG, PNG y WebP/);
  });

  it("rechaza un archivo vacío", async () => {
    await expect(
      inspectImage(fileOf(new Uint8Array(0), "vacio.png", "image/png")),
    ).rejects.toThrow(/vacío/);
  });

  it("rechaza un archivo más grande que el máximo", async () => {
    const big = new File(["x".repeat(MAX_UPLOAD_BYTES + 1)], "grande.png", {
      type: "image/png",
    });

    await expect(inspectImage(big)).rejects.toThrow(/pesa más de/);
  });
});

describe("inspectReceipt", () => {
  it("acepta un PDF", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n");
    const result = await inspectReceipt(fileOf(pdf, "factura.pdf", "application/pdf"));

    expect(result.mimeType).toBe("application/pdf");
    expect(result.sizeBytes).toBeGreaterThan(0);
  });

  it("rechaza un SVG también acá", async () => {
    const svg = new TextEncoder().encode("<svg></svg>");

    await expect(
      inspectReceipt(fileOf(svg, "factura.pdf", "application/pdf")),
    ).rejects.toThrow(UnsupportedFileError);
  });
});

describe("storageKeyFor", () => {
  it("genera una ruta con fecha y extensión, sin el nombre original", () => {
    // El nombre original no se usa como ruta: puede traer `../`, puede tener miles
    // de caracteres y puede filtrar información del disco de quien sube.
    const key = storageKeyFor("application/pdf", new Date("2026-09-09T12:00:00Z"));

    expect(key).toMatch(/^2026-09-09\/[0-9a-f-]{36}\.pdf$/);
  });

  it("no genera dos veces la misma ruta", () => {
    const now = new Date("2026-09-09T12:00:00Z");

    expect(storageKeyFor("image/png", now)).not.toBe(storageKeyFor("image/png", now));
  });
});
