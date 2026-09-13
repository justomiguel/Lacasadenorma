import { describe, expect, it } from "vitest";

import { getContent } from "@/content/pack";
import {
  ACCOUNT_EMAIL_KINDS,
  EMAIL_KINDS,
  PLEDGE_EMAIL_KINDS,
  STAFF_EMAIL_KINDS,
  idempotencyKeyFor,
} from "@/src/domain/ports/email";
import { LOCALES } from "@/src/i18n/locale";

import { EMAIL_FOREST, EMAIL_PAPER } from "./layout";
import {
  buildAccountEmail,
  buildPledgeEmail,
  buildStaffEmail,
  type AccountFacts,
  type PledgeFacts,
} from "./messages";

const CUENTA: AccountFacts = {
  userId: "7f1c9a52-0000-4000-8000-000000000009",
  recipient: "quien.dona@ejemplo.invalid",
  locale: "es",
  accountUrl: "https://lacasadenorma.example/cuenta",
};

const RESERVA: PledgeFacts = {
  pledgeId: "7f1c9a52-0000-4000-8000-000000000001",
  recipient: "quien.dona@ejemplo.invalid",
  locale: "es",
  what: "3 bolsas de cemento",
  expiresOn: "22 de septiembre de 2026",
  accountUrl: "https://lacasadenorma.example/cuenta",
};

const MARCA_SUELTA = /\{[a-z]+\}/;

describe("los correos de una cuenta", () => {
  it("se arman en los dos idiomas, con asunto, texto, html y preheader", () => {
    for (const locale of LOCALES) {
      for (const kind of ACCOUNT_EMAIL_KINDS) {
        const message = buildAccountEmail(kind, { ...CUENTA, locale });

        expect(message.to, `${kind}/${locale}`).toBe(CUENTA.recipient);
        expect(message.subject.length, `${kind}/${locale}`).toBeGreaterThan(0);
        expect(message.text, `${kind}/${locale}`).toContain(
          "https://lacasadenorma.example/cuenta",
        );
        expect(message.html, `${kind}/${locale}`).toContain("<h1");
        expect(message.html, `${kind}/${locale}`).toContain(
          getContent(locale).emails[
            kind === "account.received"
              ? "accountReceived"
              : kind === "account.approved"
                ? "accountApproved"
                : "accountDeclined"
          ].preheader.replaceAll("&", "&amp;"),
        );
      }
    }
  });

  it("van en el idioma de la cuenta, no en el del servidor", () => {
    const castellano = buildAccountEmail("account.received", CUENTA);
    const ingles = buildAccountEmail("account.received", { ...CUENTA, locale: "en" });

    expect(castellano.subject).toBe(getContent("es").emails.accountReceived.subject);
    expect(ingles.subject).toBe(getContent("en").emails.accountReceived.subject);
    expect(ingles.subject).not.toBe(castellano.subject);
  });
});

describe("los correos de una reserva", () => {
  it("no deja ninguna marca de sustitución sin reemplazar", () => {
    for (const locale of LOCALES) {
      for (const kind of PLEDGE_EMAIL_KINDS) {
        const message = buildPledgeEmail(kind, { ...RESERVA, locale });

        for (const parte of [message.subject, message.text, message.html]) {
          expect(parte, `${kind}/${locale}: ${parte}`).not.toMatch(MARCA_SUELTA);
        }
      }
    }
  });

  it("la clave de idempotencia es <kind>/<subject_id> y no lleva nada personal", () => {
    for (const kind of PLEDGE_EMAIL_KINDS) {
      const message = buildPledgeEmail(kind, RESERVA);

      expect(message.idempotencyKey).toBe(`${kind}/${RESERVA.pledgeId}`);
      expect(message.idempotencyKey).not.toContain(RESERVA.recipient);
    }
  });

  it("el recordatorio dice cuándo vence, y sin fecha no inventa una", () => {
    const conFecha = buildPledgeEmail("pledge.reminder", RESERVA);
    const sinFecha = buildPledgeEmail("pledge.reminder", { ...RESERVA, expiresOn: null });

    expect(conFecha.text).toContain("22 de septiembre de 2026");
    expect(sinFecha.text).not.toMatch(MARCA_SUELTA);
    expect(sinFecha.text).not.toMatch(/2026/);
  });

  it("destaca lo reservado, no lo esconde en un párrafo", () => {
    const message = buildPledgeEmail("pledge.confirmed", RESERVA);

    expect(message.html).toContain("3 bolsas de cemento");
    expect(message.html).toMatch(/border-left:4px solid/);
  });
});

describe("los avisos al equipo", () => {
  it("no llevan el correo ni el nombre de quien pidió", () => {
    const message = buildStaffEmail("staff.new_account", {
      subjectId: CUENTA.userId,
      staffAddress: "equipo@ejemplo.invalid",
      what: null,
      backofficeUrl: "https://lacasadenorma.example/admin/donantes",
    });

    for (const parte of [message.subject, message.text, message.html]) {
      expect(parte).not.toContain(CUENTA.recipient);
      expect(parte).not.toContain("quien.dona");
    }

    expect(message.to).toBe("equipo@ejemplo.invalid");
    expect(message.idempotencyKey).toBe(
      idempotencyKeyFor("staff.new_account", CUENTA.userId),
    );
  });

  it("van siempre en castellano, porque el backoffice no se traduce", () => {
    const message = buildStaffEmail("staff.new_pledge", {
      subjectId: RESERVA.pledgeId,
      staffAddress: "equipo@ejemplo.invalid",
      what: RESERVA.what,
      backofficeUrl: "https://lacasadenorma.example/admin/donaciones",
    });

    expect(message.subject).toBe(getContent("es").emails.staffNewPledge.subject);
  });
});

describe("la plantilla", () => {
  const todos = [
    ...LOCALES.flatMap((locale) => [
      ...ACCOUNT_EMAIL_KINDS.map((kind) =>
        buildAccountEmail(kind, { ...CUENTA, locale }),
      ),
      ...PLEDGE_EMAIL_KINDS.map((kind) => buildPledgeEmail(kind, { ...RESERVA, locale })),
    ]),
    ...STAFF_EMAIL_KINDS.map((kind) =>
      buildStaffEmail(kind, {
        subjectId: RESERVA.pledgeId,
        staffAddress: "equipo@ejemplo.invalid",
        what: kind === "staff.new_account" ? null : RESERVA.what,
        backofficeUrl: "https://lacasadenorma.example/admin/donantes",
      }),
    ),
  ];

  it("pinta el bosque y el papel del sitio, no un blanco de proveedor", () => {
    for (const message of todos) {
      expect(message.html, message.subject).toContain(EMAIL_FOREST);
      expect(message.html, message.subject).toContain(EMAIL_PAPER);
      expect(message.html, message.subject).toContain(
        getContent("es").site.name.toUpperCase(),
      );
    }
  });

  it("usa una sola tabla de maquetación y ninguna de cuerpo", () => {
    for (const message of todos) {
      const tablas = message.html.match(/<table\b/gi) ?? [];

      expect(tablas.length, message.subject).toBe(2);
      expect(message.html, message.subject).toContain('role="presentation"');
    }
  });

  it("ninguna imagen remota ni pixel de seguimiento", () => {
    for (const message of todos) {
      expect(message.html, message.subject).not.toMatch(/<img\b/i);
      expect(message.html, message.subject).not.toMatch(/background-image/i);
      expect(message.html, message.subject).not.toMatch(/url\s*\(/i);
    }
  });

  it("ningún enlace que autentique: el token vive en la sesión, no en el correo", () => {
    for (const message of todos) {
      expect(message.text, message.subject).not.toMatch(
        /token|token_hash|access_token|[?&]t=/i,
      );
    }
  });

  it("las clases del puerto están cubiertas y no hay una undécima", () => {
    expect(
      [...ACCOUNT_EMAIL_KINDS, ...PLEDGE_EMAIL_KINDS, ...STAFF_EMAIL_KINDS].sort(),
    ).toEqual([...EMAIL_KINDS].sort());
  });
});
