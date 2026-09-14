import { describe, expect, it } from "vitest";

import { addUpdatePhoto, saveUpdate, setUpdatePublished } from "./updates";
import { CAMPAIGN, RECORD, deps } from "./admin-test-helpers";

// ── Novedades ───────────────────────────────────────────────────────────────

describe("novedades", () => {
  const draft = {
    campaignId: CAMPAIGN,
    slug: "empezo-el-techo",
    title: "Empezó el techo",
    body: "Llegaron las chapas.\n\n- Cabriadas colocadas\n- Falta el cenefado",
  };

  it("guarda un borrador sin publicarlo", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await saveUpdate(editor, draft);

    expect(result.status).toBe("ok");
    expect(fake.calls.map((call) => call.name)).toEqual(["saveUpdate", "audit.append"]);
  });

  /** Un `<script>` en el cuerpo sería un XSS con privilegios de administración (T4). */
  it("rechaza HTML en el cuerpo", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await saveUpdate(editor, {
      ...draft,
      body: "Avance del techo <script>fetch('/api')</script>",
    });

    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" ? result.fieldErrors : {}).toHaveProperty("body");
    expect(fake.calls).toEqual([]);
  });

  it("rechaza un iframe de terceros en el cuerpo", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await saveUpdate(editor, {
      ...draft,
      body: 'Mirá <iframe src="https://www.youtube.com/embed/abc"></iframe>',
    });

    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" ? result.fieldErrors : {}).toHaveProperty("body");
    expect(fake.calls).toEqual([]);
  });

  it("rechaza una dirección web con mayúsculas o espacios", async () => {
    const { deps: editor } = deps("editor");
    const result = await saveUpdate(editor, { ...draft, slug: "Empezó el techo" });

    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" ? result.fieldErrors : {}).toHaveProperty("slug");
  });

  /**
   * `saveUpdate` es también la operación con la que se edita una novedad ya publicada,
   * así que su rastro no es opcional: sin él, cambiar lo que dice el sitio sería
   * invisible (ADR-020). El cuerpo no va al diff, que puede tener 20.000 caracteres.
   */
  it("guardar deja rastro con el título, y sin el cuerpo", async () => {
    const { deps: editor, fake } = deps("editor");
    await saveUpdate(editor, draft);

    expect(fake.audit).toHaveLength(1);
    expect(fake.audit[0]).toMatchObject({
      action: "update.created",
      entityTable: "updates",
      diff: { slug: "empezo-el-techo", title: "Empezó el techo" },
    });
    expect(JSON.stringify(fake.audit)).not.toContain("chapas");
  });

  it("editar una novedad existente se distingue de crearla", async () => {
    const { deps: editor, fake } = deps("editor");
    await saveUpdate(editor, { ...draft, id: RECORD });

    expect(fake.audit[0]).toMatchObject({ action: "update.updated" });
  });

  it("publicar deja rastro y despublicar también", async () => {
    const { deps: editor, fake } = deps("editor");

    await setUpdatePublished(editor, { id: RECORD, publish: "si" });
    await setUpdatePublished(editor, { id: RECORD, publish: "no" });

    expect(fake.audit.map((entry) => entry.action)).toEqual([
      "update.published",
      "update.unpublished",
    ]);
  });

  it("exige una descripción real para la foto (FR-024)", async () => {
    const { deps: editor, fake } = deps("editor");
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "techo.jpg", {
      type: "image/jpeg",
    });

    const sinAlt = await addUpdatePhoto(editor, { updateId: RECORD, file, alt: "" });
    const cortito = await addUpdatePhoto(editor, {
      updateId: RECORD,
      file,
      alt: "techo",
    });

    expect(sinAlt.status).toBe("invalid");
    expect(cortito.status).toBe("invalid");
    expect(fake.calls).toEqual([]);
  });

  it("sube la foto y la asocia a la novedad", async () => {
    const { deps: editor, fake } = deps("editor");
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "techo.jpg", {
      type: "image/jpeg",
    });

    const result = await addUpdatePhoto(editor, {
      updateId: RECORD,
      file,
      alt: "Cabriadas de madera apoyadas sobre los muros",
    });

    expect(result.status).toBe("ok");
    expect(fake.calls.map((call) => call.name)).toEqual([
      "createMedia",
      "attachMediaToUpdate",
      "audit.append",
    ]);
  });

  it("un video con descripción real deja rastro distinto al de una foto", async () => {
    const { deps: editor, fake } = deps("editor");
    const file = new File([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], "colada.mp4", {
      type: "video/mp4",
    });

    const result = await addUpdatePhoto(editor, {
      updateId: RECORD,
      file,
      alt: "La colada del contrapiso, de un extremo al otro",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.value.kind).toBe("video");
      expect(result.message).toMatch(/video/i);
    }
    expect(fake.audit[0]).toMatchObject({
      action: "update.video_added",
      entityTable: "updates",
      entityId: RECORD,
    });
  });

  /**
   * La entidad del rastro es la novedad y no la foto: quien lee el registro pregunta
   * qué le pasó a esta novedad, y el identificador de la fila de `media` no contesta.
   */
  it("la foto deja rastro colgado de la novedad, no de la foto", async () => {
    const { deps: editor, fake } = deps("editor");
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "techo.jpg", {
      type: "image/jpeg",
    });

    await addUpdatePhoto(editor, {
      updateId: RECORD,
      file,
      alt: "Cabriadas de madera apoyadas sobre los muros",
    });

    expect(fake.audit[0]).toMatchObject({
      action: "update.photo_added",
      entityTable: "updates",
      entityId: RECORD,
    });
  });

  it("el epígrafe y el crédito se guardan; el vacío queda ausente", async () => {
    const { deps: editor, fake } = deps("editor");
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "techo.jpg", {
      type: "image/jpeg",
    });

    const conDatos = await addUpdatePhoto(editor, {
      updateId: RECORD,
      file,
      alt: "Cabriadas de madera apoyadas sobre los muros",
      caption: "Las cabriadas, el martes.",
      credit: "Familia",
    });
    const sinDatos = await addUpdatePhoto(editor, {
      updateId: RECORD,
      file,
      alt: "Cabriadas de madera apoyadas sobre los muros",
      caption: "",
      credit: "   ",
    });

    expect(conDatos.status).toBe("ok");
    expect(sinDatos.status).toBe("ok");

    const altas = fake.calls.filter((call) => call.name === "createMedia");

    expect(altas[0]?.input).toMatchObject({
      caption: "Las cabriadas, el martes.",
      credit: "Familia",
    });
    expect(altas[1]?.input).toMatchObject({ caption: null, credit: null });
  });

  it("un video manda el fotograma de portada; una foto no", async () => {
    const { deps: editor, fake } = deps("editor");
    const video = new File([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], "colada.mp4", {
      type: "video/mp4",
    });
    const poster = new File([new Uint8Array([0xff, 0xd8, 0xff])], "colada.jpg", {
      type: "image/jpeg",
    });
    const foto = new File([new Uint8Array([0xff, 0xd8, 0xff])], "techo.jpg", {
      type: "image/jpeg",
    });

    const conVideo = await addUpdatePhoto(editor, {
      updateId: RECORD,
      file: video,
      alt: "La colada del contrapiso, de un extremo al otro",
      poster,
    });
    const conFoto = await addUpdatePhoto(editor, {
      updateId: RECORD,
      file: foto,
      alt: "Cabriadas de madera apoyadas sobre los muros",
    });

    expect(conVideo.status).toBe("ok");
    expect(conFoto.status).toBe("ok");

    const altas = fake.calls.filter((call) => call.name === "createMedia");

    expect(altas[0]?.input).toMatchObject({ poster });
    expect(altas[1]?.input).toMatchObject({ poster: null });
  });
});
