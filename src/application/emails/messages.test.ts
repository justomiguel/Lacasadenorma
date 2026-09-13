import { describe, expect, it } from "vitest";

import { getContent } from "@/content/pack";
import { EMAIL_KINDS, idempotencyKeyFor } from "@/src/domain/ports/email";
import { LOCALES } from "@/src/i18n/locale";

import {
  buildPledgeEmail,
  buildStaffEmail,
  DONOR_EMAIL_KINDS,
  type PledgeFacts,
} from "./messages";

/**
 * El armado de los cuatro correos.
 *
 * Lo que se verifica no es que el texto quede lindo, que no es verificable, sino
 * las cuatro propiedades que se rompen en silencio:
 *
 * 1. **Ninguna marca de sustitución sobrevive.** Un `{what}` sin reemplazar llega
 *    a la bandeja de entrada de una persona y el sistema no se entera.
 * 2. **El correo va en el idioma de la cuenta** (FR-232), no en el de quien
 *    disparó la operación ni en el del servidor.
 * 3. **Ningún cuerpo lleva datos de terceros.** El aviso al equipo dice qué se
 *    reservó; el nombre y el correo de quien reservó se leen en el backoffice, con
 *    sesión, y no en una bandeja de entrada (ADR-028, contrato de correos).
 * 4. **Ningún cuerpo trae una imagen remota ni un enlace que autentique.** Es
 *    ADR-010 aplicado al correo: acá no se mide si alguien abrió nada, y el enlace
 *    lleva a `/cuenta`, donde se pide sesión (FR-237).
 */

const HECHOS: PledgeFacts = {
  pledgeId: "7f1c9a52-0000-4000-8000-000000000001",
  recipient: "quien.dona@ejemplo.invalid",
  locale: "es",
  what: "3 bolsas de cemento",
  expiresOn: "22 de septiembre de 2026",
  accountUrl: "https://lacasadenorma.example/cuenta",
};

describe("los correos de una reserva", () => {
  it("se arman en los dos idiomas, con asunto, texto y html", () => {
    for (const locale of LOCALES) {
      for (const kind of DONOR_EMAIL_KINDS) {
        const message = buildPledgeEmail(kind, { ...HECHOS, locale });

        expect(message.to, `${kind}/${locale}`).toBe(HECHOS.recipient);
        expect(message.subject.length, `${kind}/${locale}`).toBeGreaterThan(0);
        expect(message.text.length, `${kind}/${locale}`).toBeGreaterThan(0);
        expect(message.html, `${kind}/${locale}`).toContain("<p>");
      }
    }
  });

  it("no deja ninguna marca de sustitución sin reemplazar", () => {
    for (const locale of LOCALES) {
      for (const kind of DONOR_EMAIL_KINDS) {
        const message = buildPledgeEmail(kind, { ...HECHOS, locale });

        for (const parte of [message.subject, message.text, message.html]) {
          expect(parte, `${kind}/${locale}: ${parte}`).not.toMatch(/\{[a-z]+\}/);
        }
      }
    }
  });

  it("van en el idioma de la cuenta y no en el del servidor", () => {
    const castellano = buildPledgeEmail("pledge.confirmed", HECHOS);
    const ingles = buildPledgeEmail("pledge.confirmed", { ...HECHOS, locale: "en" });

    expect(castellano.subject).toBe(getContent("es").emails.pledgeConfirmed.subject);
    expect(ingles.subject).toBe(getContent("en").emails.pledgeConfirmed.subject);
    expect(ingles.subject).not.toBe(castellano.subject);
  });

  it("la clave de idempotencia es <kind>/<pledge_id> y no lleva nada personal", () => {
    for (const kind of DONOR_EMAIL_KINDS) {
      const message = buildPledgeEmail(kind, HECHOS);

      expect(message.idempotencyKey).toBe(`${kind}/${HECHOS.pledgeId}`);
      expect(message.idempotencyKey).not.toContain(HECHOS.recipient);
    }
  });

  it("nombran lo reservado y enlazan a la cuenta", () => {
    for (const kind of DONOR_EMAIL_KINDS) {
      const message = buildPledgeEmail(kind, HECHOS);

      expect(message.text, kind).toContain(HECHOS.what);
      expect(message.text, kind).toContain(HECHOS.accountUrl);
    }
  });

  /**
   * El recordatorio es el único que necesita la fecha, y es el único que la
   * nombra. Que un correo sin vencimiento no invente uno es la versión por correo
   * de "ningún dato inventado llega a la interfaz".
   */
  it("el recordatorio dice cuándo vence, y sin fecha no inventa una", () => {
    const conFecha = buildPledgeEmail("pledge.reminder", HECHOS);
    const sinFecha = buildPledgeEmail("pledge.reminder", { ...HECHOS, expiresOn: null });

    expect(conFecha.text).toContain("22 de septiembre de 2026");
    expect(sinFecha.text).not.toMatch(/\{when\}/);
    expect(sinFecha.text).not.toMatch(/2026/);
  });
});

describe("el aviso al equipo", () => {
  it("no lleva el correo ni el nombre de quien reservó", () => {
    const message = buildStaffEmail({
      pledgeId: HECHOS.pledgeId,
      staffAddress: "equipo@ejemplo.invalid",
      what: HECHOS.what,
      backofficeUrl: "https://lacasadenorma.example/admin/donaciones",
    });

    for (const parte of [message.subject, message.text, message.html]) {
      expect(parte).not.toContain(HECHOS.recipient);
      expect(parte).not.toContain("quien.dona");
    }

    expect(message.to).toBe("equipo@ejemplo.invalid");
    expect(message.idempotencyKey).toBe(
      idempotencyKeyFor("staff.new_pledge", HECHOS.pledgeId),
    );
  });

  /**
   * El backoffice no se traduce (ADR-014), así que este correo tampoco: quien lo
   * recibe entra a `/admin`, que está en castellano. No recibe un `locale` a
   * propósito, para que no haya dónde pasarle el idioma de la persona que reservó.
   */
  it("va siempre en castellano, porque el backoffice no se traduce", () => {
    const message = buildStaffEmail({
      pledgeId: HECHOS.pledgeId,
      staffAddress: "equipo@ejemplo.invalid",
      what: HECHOS.what,
      backofficeUrl: "https://lacasadenorma.example/admin/donaciones",
    });

    expect(message.subject).toBe(getContent("es").emails.staffNewPledge.subject);
  });
});

describe("lo que ningún correo puede llevar", () => {
  const todos = [
    ...LOCALES.flatMap((locale) =>
      DONOR_EMAIL_KINDS.map((kind) => buildPledgeEmail(kind, { ...HECHOS, locale })),
    ),
    buildStaffEmail({
      pledgeId: HECHOS.pledgeId,
      staffAddress: "equipo@ejemplo.invalid",
      what: HECHOS.what,
      backofficeUrl: "https://lacasadenorma.example/admin/donaciones",
    }),
  ];

  it("ninguna imagen remota ni pixel de seguimiento", () => {
    for (const message of todos) {
      expect(message.html, message.subject).not.toMatch(/<img\b/i);
      expect(message.html, message.subject).not.toMatch(/background(-image)?\s*:/i);
    }
  });

  it("ninguna tabla de maquetación: son párrafos, un dato y un enlace", () => {
    for (const message of todos) {
      expect(message.html, message.subject).not.toMatch(/<table\b/i);
    }
  });

  it("ningún enlace que autentique: el token vive en la sesión, no en el correo", () => {
    for (const message of todos) {
      expect(message.text, message.subject).not.toMatch(
        /token|token_hash|access_token|[?&]t=/i,
      );
    }
  });

  it("las cuatro clases del puerto están cubiertas y no hay una quinta", () => {
    expect([...DONOR_EMAIL_KINDS, "staff.new_pledge"].sort()).toEqual(
      [...EMAIL_KINDS].sort(),
    );
  });
});
