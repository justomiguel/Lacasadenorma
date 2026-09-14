import { describe, expect, it } from "vitest";

import { coverFrameSeekSeconds, VIDEO_COVER_FRAME } from "./video-cover";

describe("coverFrameSeekSeconds", () => {
  it("el fotograma 10 a 30 fps es 0,3 s, no el segundo 10", () => {
    expect(VIDEO_COVER_FRAME).toBe(10);
    expect(coverFrameSeekSeconds(12)).toBeCloseTo(0.3);
  });

  it("un video más corto que diez fotogramas busca el último instante", () => {
    expect(coverFrameSeekSeconds(0.1)).toBeCloseTo(0.099);
  });

  it("sin duración no inventa un seek", () => {
    expect(coverFrameSeekSeconds(0)).toBe(0);
    expect(coverFrameSeekSeconds(Number.NaN)).toBe(0);
  });
});
