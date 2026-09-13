import { describe, expect, it } from "vitest";

import { fakeAdminGateway } from "../test-support/fake-admin-gateway";
import { fakeLogger } from "../test-support/fake-data-layer";
import { saveBudgetItem, updateGoal } from "./campaign";
import { recordExpense } from "./expenses";
import { saveMilestone } from "./milestones";
import { savePaymentMethod, setPaymentMethodPublished } from "./payment-methods";
import { CAMPAIGN, RECORD, deps, validExpense } from "./admin-test-helpers";

// ── Objetivo, rubros e hitos ────────────────────────────────────────────────

describe("objetivo y presupuesto", () => {
  it("acepta un objetivo vacío, que significa que todavía no hay meta", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await updateGoal(admin, {
      campaignId: CAMPAIGN,
      amount: "",
      currency: "ARS",
    });

    expect(result.status).toBe("ok");
    expect(fake.calls[0]).toMatchObject({ input: { goal: null } });
  });

  it("guarda un rubro sin cotizar sin inventarle un cero", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await saveBudgetItem(admin, {
      campaignId: CAMPAIGN,
      title: "Instalación eléctrica",
      currency: "ARS",
      amount: "",
    });

    expect(result.status).toBe("ok");
    expect(fake.calls[0]).toMatchObject({ input: { estimatedAmount: null } });
  });
});

describe("hitos", () => {
  it("exige la fecha cuando el hito está completado", async () => {
    const { deps: editor } = deps("editor");
    const result = await saveMilestone(editor, {
      campaignId: CAMPAIGN,
      title: "Techo colocado",
      status: "completado",
    });

    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" ? result.fieldErrors : {}).toHaveProperty(
      "happenedOn",
    );
  });

  it("acepta un hito pendiente sin fecha, porque no se estima", async () => {
    const { deps: editor } = deps("editor");
    const result = await saveMilestone(editor, {
      campaignId: CAMPAIGN,
      title: "Instalación eléctrica",
      status: "pendiente",
    });

    expect(result.status).toBe("ok");
  });

  /**
   * Es la operación hermana de `saveBudgetItem`: misma forma, misma casilla de
   * publicación, y las dos cambian lo que muestra el sitio. Durante un tiempo una
   * auditaba y la otra no, sin que nada explicara la diferencia (ADR-020).
   */
  it("guardar un hito deja rastro con el estado y si quedó publicado", async () => {
    const { deps: editor, fake } = deps("editor");
    await saveMilestone(editor, {
      campaignId: CAMPAIGN,
      title: "Techo colocado",
      status: "completado",
      happenedOn: "2026-08-20",
      publish: "on",
    });

    expect(fake.audit).toHaveLength(1);
    expect(fake.audit[0]).toMatchObject({
      action: "milestone.created",
      entityTable: "milestones",
      diff: { title: "Techo colocado", status: "completado", published: true },
    });
  });
});

// ── Cuentas bancarias ───────────────────────────────────────────────────────

describe("cuentas de aporte", () => {
  const account = {
    campaignId: CAMPAIGN,
    countryCode: "AR",
    currency: "ARS",
    label: "Transferencia en Argentina",
  };

  it("rechaza un marcador de relleno en un dato bancario", async () => {
    const { deps: owner, fake } = deps("owner");
    const result = await savePaymentMethod(owner, {
      ...account,
      fields: [{ label: "CBU", value: "PENDIENTE", copyable: "on" }],
    });

    expect(result.status).toBe("invalid");
    expect(fake.calls).toEqual([]);
  });

  /**
   * El formulario manda los renglones con nombres repetidos, así que el error no tiene
   * un control propio al que colgarse: tiene que nombrar el dato. Si el mensaje dijera
   * "renglón 3", quien lo lee tendría que contar los campos de la pantalla.
   */
  it("nombra los datos que están mal, porque no hay un campo por renglón", async () => {
    const { deps: owner } = deps("owner");
    const result = await savePaymentMethod(owner, {
      ...account,
      fields: [
        { label: "Alias", value: "casa.de.norma", copyable: "on" },
        { label: "CBU", value: "PENDIENTE", copyable: "on" },
        { label: "CUIT", value: "TBD", copyable: "on" },
      ],
    });

    expect(result.status).toBe("invalid");

    const message =
      result.status === "invalid" ? (result.fieldErrors["fields"] ?? "") : "";

    expect(message).toContain("CBU");
    expect(message).toContain("CUIT");
    expect(message).not.toContain("Alias");
  });

  it("rechaza dos renglones con la misma etiqueta", async () => {
    const { deps: owner, fake } = deps("owner");
    const result = await savePaymentMethod(owner, {
      ...account,
      fields: [
        { label: "CBU", value: "0170099220000067797", copyable: "on" },
        { label: "CBU", value: "0170099220000067798", copyable: "on" },
      ],
    });

    expect(result.status).toBe("invalid");
    expect(fake.calls).toEqual([]);
  });

  it("rechaza una cuenta sin ningún dato (FR-007)", async () => {
    const { deps: owner } = deps("owner");
    const result = await savePaymentMethod(owner, { ...account, fields: [] });

    expect(result.status).toBe("invalid");
  });

  it("no copia los datos bancarios al registro de auditoría", async () => {
    const { deps: owner, fake } = deps("owner");
    await savePaymentMethod(owner, {
      ...account,
      fields: [{ label: "CBU", value: "0170099220000067797", copyable: "on" }],
    });

    expect(JSON.stringify(fake.audit)).not.toContain("0170099220000067797");
    expect(fake.audit[0]).toMatchObject({ diff: { fields: ["CBU"] } });
  });

  it("guardar no publica: son dos actos distintos", async () => {
    const { deps: owner, fake } = deps("owner");
    await savePaymentMethod(owner, {
      ...account,
      fields: [{ label: "CBU", value: "0170099220000067797", copyable: "on" }],
    });

    expect(fake.calls.map((call) => call.name)).not.toContain("setMethodPublished");
  });

  it("publicar una cuenta queda registrado", async () => {
    const { deps: owner, fake } = deps("owner");
    const result = await setPaymentMethodPublished(owner, {
      id: RECORD,
      publish: "si",
    });

    expect(result.status).toBe("ok");
    expect(fake.audit[0]).toMatchObject({ action: "payment_method.published" });
  });
});

// ── Fallas ──────────────────────────────────────────────────────────────────

describe("fallas", () => {
  it("un error del puerto se convierte en resultado fallido y queda logueado", async () => {
    const gateway = fakeAdminGateway({ failWith: new Error("connection refused") });
    const logger = fakeLogger();
    const result = await recordExpense(
      {
        gateway: gateway.gateway,
        logger,
        actor: { userId: "u", role: "admin" },
      },
      validExpense,
    );

    expect(result.status).toBe("failed");
    expect(logger.calls.some((call) => call.startsWith("error:"))).toBe(true);
  });

  /**
   * Un cambio financiero sin rastro es peor que un cambio que no se hizo: la
   * operación falla entera y quien la pidió lo ve (FR-016, principio XII).
   */
  it("si el registro de auditoría falla, la operación falla", async () => {
    const gateway = fakeAdminGateway({ auditFailsWith: new Error("audit down") });
    const result = await recordExpense(
      {
        gateway: gateway.gateway,
        logger: fakeLogger(),
        actor: { userId: "u", role: "admin" },
      },
      validExpense,
    );

    expect(result.status).toBe("failed");
  });
});
