import { describe, expect, it } from "vitest";

import { LOCALES } from "@/src/i18n/locale";

import { getContent } from "./pack";

/**
 * Lo que el esquema de `emails.json` no puede afirmar solo.
 *
 * Zod verifica forma. Esto verifica las dos propiedades que cruzan archivos:
 * las marcas de sustitución coinciden entre idiomas, y los avisos al equipo
 * están en castellano en los dos (ADR-014).
 */

const MARCAS = ["{what}", "{when}", "{who}", "{phone}", "{link}"] as const;

const STAFF = [
  "staffNewAccount",
  "staffNewPledge",
  "staffPhoneOffer",
  "staffPledgeCancelled",
  "staffPledgeExpired",
] as const;

const DONANTE = [
  "accountReceived",
  "accountApproved",
  "accountDeclined",
  "accountConfirm",
  "accountRecover",
  "accountEmailChange",
  "accountInvite",
  "pledgeConfirmed",
  "pledgeReminder",
  "pledgeFulfilled",
  "pledgeReverted",
] as const;

function todoElTexto(correo: {
  subject: string;
  preheader: string;
  body: readonly string[];
  action: string;
  rejectAction?: string;
  extraAction?: string;
  why: string;
}): string {
  return [
    correo.subject,
    correo.preheader,
    ...correo.body,
    correo.action,
    correo.rejectAction ?? "",
    correo.extraAction ?? "",
    correo.why,
  ].join("\n");
}

describe("el texto de los correos", () => {
  it("usa las mismas marcas de sustitución en los dos idiomas", () => {
    for (const clase of DONANTE) {
      const usadas = LOCALES.map((locale) => {
        const texto = todoElTexto(getContent(locale).emails[clase]);

        return MARCAS.filter((marca) => texto.includes(marca));
      });

      expect(usadas[1], `${clase}: el inglés no usa las mismas marcas`).toEqual(
        usadas[0],
      );
    }
  });

  it("no inventa una marca que el armador no sabe reemplazar", () => {
    for (const locale of LOCALES) {
      for (const clase of [...DONANTE, ...STAFF] as const) {
        const texto = todoElTexto(getContent(locale).emails[clase]);
        const encontradas = texto.match(/\{[a-z]+\}/g) ?? [];

        for (const marca of encontradas) {
          expect(MARCAS, `${locale}/${clase}: ${marca}`).toContain(marca);
        }
      }
    }
  });

  it("el aviso de una reserva con cuenta nombra a quien reservó", () => {
    for (const locale of LOCALES) {
      expect(todoElTexto(getContent(locale).emails.staffNewPledge)).toContain("{who}");
      expect(getContent(locale).emails.staffNewPledge.subject).toContain("{who}");
    }
  });

  it("sólo el aviso por teléfono nombra el número", () => {
    for (const locale of LOCALES) {
      expect(todoElTexto(getContent(locale).emails.staffPhoneOffer)).toContain("{phone}");
      expect(getContent(locale).emails.staffPhoneOffer.extraAction).toContain("WhatsApp");

      for (const clase of [...DONANTE, ...STAFF] as const) {
        if (clase === "staffPhoneOffer") {
          continue;
        }

        expect(
          todoElTexto(getContent(locale).emails[clase]),
          `${locale}/${clase}`,
        ).not.toContain("{phone}");
      }
    }
  });

  it("sólo el recordatorio nombra el vencimiento", () => {
    for (const locale of LOCALES) {
      expect(todoElTexto(getContent(locale).emails.pledgeReminder)).toContain("{when}");

      for (const clase of [...DONANTE, ...STAFF] as const) {
        if (clase === "pledgeReminder") {
          continue;
        }

        expect(
          todoElTexto(getContent(locale).emails[clase]),
          `${locale}/${clase}`,
        ).not.toContain("{when}");
      }
    }
  });

  it("el sí del equipo no dice que donaron ni que llegó", () => {
    for (const locale of LOCALES) {
      const nuevo = todoElTexto(getContent(locale).emails.staffNewPledge);
      const vencido = todoElTexto(getContent(locale).emails.staffPledgeExpired);

      expect(nuevo).not.toMatch(/aparece como donado/i);
      expect(nuevo).not.toMatch(/fecha de hoy/i);
      expect(vencido).not.toMatch(/no confirmaron la llegada/i);
      expect(vencido).toMatch(/van a donar/i);
    }
  });

  it("los avisos al equipo dicen lo mismo en los dos archivos, y en castellano", () => {
    for (const clase of STAFF) {
      expect(getContent("en").emails[clase], clase).toEqual(
        getContent("es").emails[clase],
      );
    }
  });

  it("todos explican por qué la persona los está recibiendo", () => {
    for (const locale of LOCALES) {
      for (const clase of [...DONANTE, ...STAFF] as const) {
        expect(
          getContent(locale).emails[clase].why.split(/\s+/).length,
          `${locale}/${clase}`,
        ).toBeGreaterThan(8);
      }
    }
  });
});
