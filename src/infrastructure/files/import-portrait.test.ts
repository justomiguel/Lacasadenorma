import { describe, expect, it } from "vitest";

import { downloadTrustedPortrait } from "./import-portrait";

function pngBytes(): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, 64, false);
  view.setUint32(20, 64, false);

  return bytes;
}

describe("downloadTrustedPortrait", () => {
  it("no pide un host que no es de la red", async () => {
    const calls: string[] = [];

    const file = await downloadTrustedPortrait("https://evil.example/x", (url) => {
      calls.push(url);

      return Promise.reject(new Error("no tendría que llamarse"));
    });

    expect(file).toBeNull();
    expect(calls).toEqual([]);
  });

  it("devuelve un File cuando el CDN entrega un PNG", async () => {
    const png = pngBytes();
    const file = await downloadTrustedPortrait(
      "https://lh3.googleusercontent.com/a/foto",
      async () =>
        new Response(png, {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
    );

    expect(file).not.toBeNull();
    expect(file?.type).toBe("image/png");
    expect(file?.name).toBe("retrato.png");
  });

  it("si el CDN no contesta, no hay retrato", async () => {
    const file = await downloadTrustedPortrait(
      "https://lh3.googleusercontent.com/a/foto",
      async () => new Response(null, { status: 404 }),
    );

    expect(file).toBeNull();
  });
});
