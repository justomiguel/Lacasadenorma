import { describe, expect, it } from "vitest";

import { coverPhoto, type UpdateRecord } from "./update";
import type { MediaAsset } from "./media";

const fotoA: MediaAsset = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "photo",
  bucketId: "fotos",
  url: "https://ejemplo.test/a.jpg",
  alt: "Las cabriadas, del lado del patio",
  caption: null,
  credit: null,
  width: 1600,
  height: 1200,
  takenOn: null,
};

const fotoB: MediaAsset = {
  ...fotoA,
  id: "22222222-2222-4222-8222-222222222222",
  url: "https://ejemplo.test/b.jpg",
  alt: "El contrapiso recién colado",
};

const video: MediaAsset = {
  ...fotoA,
  id: "33333333-3333-4333-8333-333333333333",
  kind: "video",
  bucketId: "videos",
  url: "https://ejemplo.test/obra.mp4",
  alt: "La colada, de un extremo al otro",
  width: 1920,
  height: 1080,
};

function update(partial: Partial<UpdateRecord> = {}): UpdateRecord {
  return {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    slug: "empezo-el-techo",
    title: "Empezó el techo",
    body: "Llegaron las chapas.",
    publishedAt: "2026-09-06T00:00:00.000Z",
    media: [],
    ...partial,
  };
}

describe("coverPhoto", () => {
  it("la miniatura es la primera foto del cuerpo, no el primer adjunto", () => {
    const entry = update({
      body: `Texto.\n\n![el contrapiso](media:${fotoB.id})`,
      media: [fotoA, fotoB],
    });

    expect(coverPhoto(entry)?.id).toBe(fotoB.id);
  });

  it("un video al inicio del relato no hace de miniatura", () => {
    const entry = update({
      body: `![la colada](video:${video.id})\n\n![las cabriadas](media:${fotoA.id})`,
      media: [video, fotoA],
    });

    expect(coverPhoto(entry)?.id).toBe(fotoA.id);
  });

  it("si el cuerpo no nombra foto, usa la primera adjunta", () => {
    const entry = update({
      body: "Llegaron las chapas.",
      media: [video, fotoA],
    });

    expect(coverPhoto(entry)?.id).toBe(fotoA.id);
  });

  it("sin foto no inventa una miniatura", () => {
    expect(coverPhoto(update({ media: [video] }))).toBeNull();
    expect(coverPhoto(update())).toBeNull();
  });
});
