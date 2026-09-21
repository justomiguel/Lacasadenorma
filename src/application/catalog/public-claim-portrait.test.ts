import { describe, expect, it } from "vitest";

import type { CatalogPortraitPort } from "@/src/domain/ports/catalog-portraits";

import { fakeLogger } from "../test-support/fake-data-layer";
import { getPublicClaimPortrait } from "./public-claim-portrait";

class FakePortraitPort implements CatalogPortraitPort {
  constructor(private readonly file: { bytes: ArrayBuffer; mimeType: string } | null) {}

  async readPublicClaimPortrait(): Promise<{
    bytes: ArrayBuffer;
    mimeType: string;
  } | null> {
    return this.file;
  }
}

class ThrowingPortraitPort implements CatalogPortraitPort {
  async readPublicClaimPortrait(): Promise<{
    bytes: ArrayBuffer;
    mimeType: string;
  } | null> {
    throw new Error("storage down");
  }
}

describe("getPublicClaimPortrait", () => {
  it("sirve el archivo cuando el puerto lo encuentra", async () => {
    const bytes = new ArrayBuffer(4);
    const result = await getPublicClaimPortrait(
      {
        port: new FakePortraitPort({ bytes, mimeType: "image/jpeg" }),
        logger: fakeLogger(),
      },
      "c1",
    );
    expect(result).toEqual({
      status: "ok",
      data: { bytes, mimeType: "image/jpeg" },
    });
  });

  it("sin archivo es 404, no un error", async () => {
    const result = await getPublicClaimPortrait(
      { port: new FakePortraitPort(null), logger: fakeLogger() },
      "c1",
    );
    expect(result).toEqual({ status: "unavailable", reason: "not-published" });
  });

  it("sin puerto no inventa una foto", async () => {
    const result = await getPublicClaimPortrait(
      { port: null, logger: fakeLogger() },
      "c1",
    );
    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });

  it("si el puerto tira, registra y no inventa una foto", async () => {
    const logger = fakeLogger();
    const result = await getPublicClaimPortrait(
      { port: new ThrowingPortraitPort(), logger },
      "c1",
    );

    expect(result).toEqual({ status: "unavailable", reason: "error" });
    expect(logger.calls.some((call) => call.startsWith("error:"))).toBe(true);
  });
});
