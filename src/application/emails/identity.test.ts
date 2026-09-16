import { describe, expect, it } from "vitest";

import { getContent } from "@/content/pack";
import { IDENTITY_EMAIL_KINDS } from "@/src/domain/ports/email";
import { LOCALES } from "@/src/i18n/locale";

import { EMAIL_FOREST, EMAIL_PAPER } from "./layout";
import {
  buildIdentityEmail,
  confirmationLink,
  isIdentityLinkType,
  type IdentityFacts,
} from "./identity";

const TOKEN = "hashed-token-de-prueba";
const CONFIRMAR = confirmationLink(
  "https://lacasadenorma.example",
  "es",
  TOKEN,
  "signup",
);

const HECHOS: IdentityFacts = {
  userId: "7f1c9a52-0000-4000-8000-000000000009",
  recipient: "quien.dona@ejemplo.invalid",
  locale: "es",
  confirmUrl: CONFIRMAR,
  tokenStamp: TOKEN.slice(0, 8),
};

describe("confirmationLink", () => {
  it("lleva token_hash y type, y nada de origen ajeno", () => {
    expect(CONFIRMAR).toBe(
      `https://lacasadenorma.example/cuenta/confirmar?token_hash=${TOKEN}&type=signup`,
    );
    expect(
      confirmationLink("https://lacasadenorma.example", "en", TOKEN, "recovery"),
    ).toBe(
      `https://lacasadenorma.example/en/cuenta/confirmar?token_hash=${TOKEN}&type=recovery`,
    );
  });

  it("no acepta un tipo que el route handler rechazaría", () => {
    expect(isIdentityLinkType("signup")).toBe(true);
    expect(isIdentityLinkType("magiclink")).toBe(false);
  });
});

describe("los correos de identidad", () => {
  it("el enlace de confirmar lleva el token: sin eso no hay prueba de que la casilla existe", () => {
    const message = buildIdentityEmail("account.confirm", HECHOS);

    expect(message.to).toBe(HECHOS.recipient);
    expect(message.text).toContain(TOKEN);
    expect(message.text).toContain("token_hash=");
    expect(message.html).toContain("token_hash=");
    expect(message.idempotencyKey).toBe(
      `account.confirm/${HECHOS.userId}:${HECHOS.tokenStamp}`,
    );
  });

  it("van en el idioma de quien se registró", () => {
    const castellano = buildIdentityEmail("account.confirm", HECHOS);
    const ingles = buildIdentityEmail("account.confirm", { ...HECHOS, locale: "en" });

    expect(castellano.subject).toBe(getContent("es").emails.accountConfirm.subject);
    expect(ingles.subject).toBe(getContent("en").emails.accountConfirm.subject);
    expect(ingles.subject).not.toBe(castellano.subject);
  });

  it("recuperar y cambiar de dirección también llevan el enlace de canje", () => {
    for (const kind of IDENTITY_EMAIL_KINDS) {
      const message = buildIdentityEmail(kind, HECHOS);

      expect(message.text, kind).toContain(TOKEN);
      expect(message.html, kind).toContain(
        'href="https://lacasadenorma.example/cuenta/confirmar',
      );
    }
  });

  it("se visten como el sitio, no como un aviso genérico de Auth", () => {
    for (const locale of LOCALES) {
      const message = buildIdentityEmail("account.confirm", { ...HECHOS, locale });
      const tablas = message.html.match(/<table\b/gi) ?? [];

      expect(message.html).toContain(EMAIL_FOREST);
      expect(message.html).toContain(EMAIL_PAPER);
      expect(tablas).toHaveLength(2);
      expect(message.html).not.toMatch(/<img\b/i);
    }
  });
});
