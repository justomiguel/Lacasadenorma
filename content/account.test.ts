import { describe, expect, it } from "vitest";

import { ACCOUNT_ERROR_CODES } from "@/src/application/accounts/outcome";
import { LOCALES } from "@/src/i18n/locale";

import { getContent } from "./pack";

/**
 * La compuerta que mantiene juntas dos listas que viven en capas distintas.
 *
 * `ACCOUNT_ERROR_CODES` es lo que las Server Actions de `/cuenta` pueden
 * devolver; `cuenta.json` es lo que la persona lee. Si se separan, el síntoma es
 * una pantalla que muestra `undefined` donde iba el motivo, y aparece el día que
 * alguien se equivoca la contraseña en producción.
 *
 * La derivación automática no era una opción: `content/` no puede importar de
 * `src/application/` en código de producción (ADR-005). Un test sí, y es el lugar
 * correcto para una aserción de consistencia entre capas.
 */
describe("los mensajes de la cuenta", () => {
  it("cubren exactamente los códigos que las acciones devuelven, en los dos idiomas", () => {
    const esperados = [...ACCOUNT_ERROR_CODES].sort();

    for (const locale of LOCALES) {
      const publicados = Object.keys(getContent(locale).account.errors).sort();

      expect(publicados, locale).toEqual(esperados);
    }
  });

  it("ningún mensaje filtra detalle técnico: un código de Postgres no le dice nada a nadie", () => {
    for (const locale of LOCALES) {
      const textos = Object.values(getContent(locale).account.errors);

      for (const texto of textos) {
        expect(texto, texto).not.toMatch(/\b(23\d{3}|42\d{3}|P0001|PGRST|supabase)\b/i);
      }
    }
  });

  /**
   * El formulario de recuperación contesta lo mismo exista o no la cuenta, y esa
   * decisión tiene que estar **en el texto**: un "listo, te mandamos el enlace"
   * seco es indistinguible de un oráculo que confirma la existencia. La pantalla
   * dice por qué contesta así.
   */
  it("la recuperación explica por qué contesta igual exista o no la cuenta", () => {
    expect(getContent("es").account.recover.sentBody.join(" ")).toMatch(
      /qui[eé]n est[aá] registrado/i,
    );
    expect(getContent("en").account.recover.sentBody.join(" ")).toMatch(
      /who is registered/i,
    );
  });

  it("el rechazo no habla de un pedido que esta vez no se habilitó", () => {
    for (const locale of LOCALES) {
      const aviso = getContent(locale).account.errors.notApproved;
      const correo = JSON.stringify(getContent(locale).emails.accountDeclined);

      expect(aviso).not.toMatch(/esta vez/i);
      expect(aviso).not.toMatch(/this time/i);
      expect(aviso).not.toMatch(/pedido/i);
      expect(aviso).not.toMatch(/request/i);
      expect(correo).not.toMatch(/esta vez/i);
      expect(correo).not.toMatch(/this time/i);
    }
  });

  it("la cuenta pendiente no publica el aviso de pedido en revisión", () => {
    for (const locale of LOCALES) {
      const publicado = JSON.stringify(getContent(locale).account);

      expect(publicado).not.toMatch(/está revisando tu pedido/i);
      expect(publicado).not.toMatch(/is reviewing your request/i);
      expect(publicado).not.toMatch(/Confirmaste el correo, y eso alcanzó/i);
      expect(publicado).not.toMatch(/You confirmed the email, and that was enough/i);
      expect(publicado).not.toMatch(/Confirmar el correo era para escribirte/i);
      expect(publicado).not.toMatch(/not so you wait for an approval/i);
      expect(publicado).not.toMatch(/El equipo frenó esta cuenta/i);
      expect(publicado).not.toMatch(/The team stopped this account/i);
      expect(publicado).not.toMatch(/respondé el correo que te mandamos/i);
      expect(publicado).not.toMatch(/reply to the email we sent/i);
    }
  });

  it("la palabra de confirmación del borrado está traducida", () => {
    expect(getContent("es").account.profile.deleteWord).toBe("BORRAR");
    expect(getContent("en").account.profile.deleteWord).toBe("DELETE");
  });

  it("el botón de la red lleva el nombre de la marca, no un hueco", () => {
    expect(getContent("es").account.social.continueWith).toContain("{name}");
    expect(getContent("en").account.social.continueWith).toContain("{name}");
  });

  it("el formulario de editar reserva tiene las etiquetas de guardar y de la nota", () => {
    expect(getContent("es").account.profile.editPledge).toBe("Guardar cambios");
    expect(getContent("es").account.profile.savingPledge).toBe("Guardando…");
    expect(getContent("es").account.profile.pledgeNote).toBe("Nota para la familia");
    expect(getContent("es").account.profile.pledgeNoteHint).toBe(
      "Si hay algo que el equipo tenga que saber. Es optativa.",
    );
    expect(getContent("en").account.profile.editPledge).toBe("Save changes");
    expect(getContent("en").account.profile.savingPledge).toBe("Saving…");
    expect(getContent("en").account.profile.pledgeNote).toBe("Note for the family");
    expect(getContent("en").account.profile.pledgeNoteHint).toBe(
      "Anything the team should know. Optional.",
    );
  });

  it("la cantidad del formulario reutiliza la del catálogo, no se duplica en la cuenta", () => {
    expect(getContent("es").catalog.quantity).toBe("Cuántas");
    expect(getContent("en").catalog.quantity).toBe("How many");
    expect(getContent("es").account.profile).not.toHaveProperty("quantity");
    expect(getContent("en").account.profile).not.toHaveProperty("quantity");
  });
});
