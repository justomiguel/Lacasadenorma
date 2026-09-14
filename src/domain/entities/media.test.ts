import { describe, expect, it } from "vitest";

import { isPhoto, isVideo, type MediaAsset } from "./media";

const sample: MediaAsset = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "photo",
  bucketId: "fotos",
  url: "https://ejemplo.test/techo.jpg",
  alt: "Cabriadas de madera",
  caption: null,
  credit: null,
  width: 1600,
  height: 1200,
  takenOn: null,
  posterUrl: null,
  posterWidth: null,
  posterHeight: null,
};

describe("media", () => {
  it("distingue foto de video por el kind, no por la URL", () => {
    expect(isPhoto(sample)).toBe(true);
    expect(isVideo(sample)).toBe(false);
    expect(isPhoto({ ...sample, kind: "video", bucketId: "videos" })).toBe(false);
    expect(isVideo({ ...sample, kind: "video", bucketId: "videos" })).toBe(true);
  });
});
