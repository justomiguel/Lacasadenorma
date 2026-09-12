import { describe, expect, it } from "vitest";

import { noopAnalytics, type AnalyticsEvent } from "./analytics";

describe("noopAnalytics", () => {
  // Esta implementación es la que corre en producción hoy: no hay proveedor
  // configurado. Que `track()` sea seguro de llamar es lo que sostiene la promesa
  // de ADR-010 —el sitio funciona igual sin analítica—, así que si tirara una
  // excepción, el botón de ayudar dejaría de responder por un evento que a nadie
  // le importa.
  const eventos: readonly AnalyticsEvent[] = [
    { name: "ayudar_click", props: { origen: "home" } },
    { name: "metodo_visto", props: { pais: "AR" } },
    { name: "dato_copiado", props: { pais: "AR", campo: "cbu" } },
    { name: "compartir", props: { canal: "whatsapp", ruta: "/" } },
    { name: "whatsapp_click", props: { origen: "contacto" } },
    { name: "llamar_click", props: { origen: "contacto" } },
    { name: "medio_externo_click", props: { medio: "mercadopago" } },
  ];

  it("acepta los eventos declarados sin fallar y sin devolver nada", () => {
    for (const evento of eventos) {
      expect(noopAnalytics.track(evento)).toBeUndefined();
    }
  });
});
