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

  it("la cuenta pendiente no publica el aviso de pedido en revisión", () => {
    for (const locale of LOCALES) {
      const publicado = JSON.stringify(getContent(locale).account);

      expect(publicado).not.toMatch(/está revisando tu pedido/i);
      expect(publicado).not.toMatch(/is reviewing your request/i);
      expect(publicado).not.toMatch(/Confirmaste el correo, y eso alcanzó/i);
      expect(publicado).not.toMatch(/You confirmed the email, and that was enough/i);
    }
  });

  it("la palabra de confirmación del borrado está traducida", () => {
    expect(getContent("es").account.profile.deleteWord).toBe("BORRAR");
    expect(getContent("en").account.profile.deleteWord).toBe("DELETE");
  });
});
