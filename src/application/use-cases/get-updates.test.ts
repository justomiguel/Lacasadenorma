import { describe, expect, it } from "vitest";

import type { UpdateRecord } from "@/src/domain/entities";

import type { DataLayer } from "../data-layer";
import {
  contentOnlyLayer,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import { findUpdate, listUpdates } from "./get-updates";

function update(partial: Partial<UpdateRecord> = {}): UpdateRecord {
  return {
    id: crypto.randomUUID(),
    slug: "se-compraron-las-chapas",
    title: "Se compraron las chapas",
    body: "El 3 de septiembre se compraron las chapas del techo.",
    publishedAt: "2026-09-03T00:00:00.000Z",
    media: [],
    ...partial,
  };
}

describe("listUpdates", () => {
  it("devuelve las novedades que el puerto publica", async () => {
    const result = await listUpdates({
      dataLayer: fakeSupabaseLayer({ updates: [update()] }),
      logger: fakeLogger(),
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.title).toBe("Se compraron las chapas");
  });

  it("ninguna novedad todavía es una lista vacía, no una falla", async () => {
    // La distinción llega hasta la pantalla: "todavía no hay novedades" es una
    // frase honesta, y "no se pudieron cargar las novedades" sería una mentira.
    const result = await listUpdates({
      dataLayer: fakeSupabaseLayer({ updates: [] }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "ok", data: [] });
  });

  it("sin base configurada no dice que no hay novedades: dice que no sabe", async () => {
    const result = await listUpdates({
      dataLayer: contentOnlyLayer,
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });

  it("sin campaña activa distingue el motivo", async () => {
    const result = await listUpdates({
      dataLayer: fakeSupabaseLayer({ campaign: null }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-published" });
  });

  it("si la lectura falla lo registra y no devuelve una lista a medias", async () => {
    const logger = fakeLogger();

    const result = await listUpdates({
      dataLayer: fakeSupabaseLayer({ failWith: new Error("timeout") }),
      logger,
    });

    expect(result).toEqual({ status: "unavailable", reason: "error" });
    expect(logger.calls).toContain("error:No se pudieron leer las novedades");
  });

  it("le pasa el límite al puerto en lugar de recortar después", async () => {
    // Recortar en la aplicación traería todas las filas para tirar la mayoría.
    // En la home, donde se muestran las últimas tres, esa diferencia es la consulta
    // entera.
    let pedido: number | undefined = -1;

    const layer: DataLayer = {
      ...fakeSupabaseLayer({ updates: [update()] }),
      updates: {
        listPublishedUpdates: (_campaignId, limit) => {
          pedido = limit;
          return Promise.resolve([]);
        },
        findPublishedUpdateBySlug: () => Promise.resolve(null),
      },
    };

    await listUpdates({ dataLayer: layer, logger: fakeLogger(), limit: 3 });

    expect(pedido).toBe(3);
  });
});

describe("findUpdate", () => {
  it("encuentra una novedad publicada por su slug", async () => {
    const result = await findUpdate({
      dataLayer: fakeSupabaseLayer({ updates: [update({ slug: "el-contrapiso" })] }),
      logger: fakeLogger(),
      slug: "el-contrapiso",
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data?.slug).toBe("el-contrapiso");
  });

  it("un slug que no existe devuelve ok con null, y la página contesta 404", async () => {
    // No es `unavailable`: la lectura funcionó y la respuesta es que no hay tal
    // novedad. Confundir las dos convertiría un 404 legítimo en un aviso de que el
    // sitio está caído, y un borrador adivinado por URL en un error del sistema.
    const result = await findUpdate({
      dataLayer: fakeSupabaseLayer({ updates: [update({ slug: "el-contrapiso" })] }),
      logger: fakeLogger(),
      slug: "un-borrador-adivinado",
    });

    expect(result).toEqual({ status: "ok", data: null });
  });

  it("sin base configurada no responde 404, que afirmaría que la novedad no existe", async () => {
    const result = await findUpdate({
      dataLayer: contentOnlyLayer,
      logger: fakeLogger(),
      slug: "el-contrapiso",
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });

  it("si la lectura falla lo registra con el slug que se buscaba", async () => {
    const logger = fakeLogger();

    const result = await findUpdate({
      dataLayer: fakeSupabaseLayer({ failWith: new Error("timeout") }),
      logger,
      slug: "el-contrapiso",
    });

    expect(result).toEqual({ status: "unavailable", reason: "error" });
    expect(logger.calls).toContain("error:No se pudo leer la novedad");
  });
});
