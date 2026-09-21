import { describe, expect, it } from "vitest";

import { QueryError } from "./admin/query";
import { donorAccessUrl, type DonorLinkGenerate } from "./provision-donor";

function generate(
  results: ReadonlyArray<{
    type: "invite" | "recovery";
    token?: string;
    error?: { code?: string; message: string };
  }>,
): { calls: Array<"invite" | "recovery">; generate: DonorLinkGenerate } {
  const calls: Array<"invite" | "recovery"> = [];
  let index = 0;

  return {
    calls,
    generate: async (type) => {
      const next = results[index];
      index += 1;
      calls.push(type);

      if (next === undefined || next.type !== type) {
        throw new Error(`generateLink inesperado: ${type}`);
      }

      if (next.error !== undefined) {
        return { data: { properties: { hashed_token: "" } }, error: next.error };
      }

      return {
        data: { properties: { hashed_token: next.token ?? "token-invite" } },
        error: null,
      };
    },
  };
}

describe("donorAccessUrl", () => {
  it("sin confirmar usa invite", async () => {
    const auth = generate([{ type: "invite", token: "abc-invite" }]);

    await expect(
      donorAccessUrl(auth.generate, {
        siteUrl: "https://lacasadenorma.example",
        locale: "es",
      }),
    ).resolves.toBe(
      "https://lacasadenorma.example/cuenta/confirmar?token_hash=abc-invite&type=invite",
    );
    expect(auth.calls).toEqual(["invite"]);
  });

  it("si invite choca con email_exists (correo ya confirmado) cae a recovery", async () => {
    const auth = generate([
      {
        type: "invite",
        error: {
          code: "email_exists",
          message: "A user with this email address has already been registered",
        },
      },
      { type: "recovery", token: "abc-recovery" },
    ]);

    await expect(
      donorAccessUrl(auth.generate, {
        siteUrl: "https://lacasadenorma.example",
        locale: "en",
      }),
    ).resolves.toBe(
      "https://lacasadenorma.example/en/cuenta/confirmar?token_hash=abc-recovery&type=recovery",
    );
    expect(auth.calls).toEqual(["invite", "recovery"]);
  });

  it("otro error de invite no se disfraza de recovery", async () => {
    const auth = generate([
      { type: "invite", error: { code: "unexpected_failure", message: "boom" } },
    ]);

    await expect(
      donorAccessUrl(auth.generate, {
        siteUrl: "https://lacasadenorma.example",
        locale: "es",
      }),
    ).rejects.toBeInstanceOf(QueryError);
    expect(auth.calls).toEqual(["invite"]);
  });
});
