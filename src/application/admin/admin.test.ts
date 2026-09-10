import { describe, expect, it } from "vitest";

import { fakeAdminGateway } from "../test-support/fake-admin-gateway";
import { fakeLogger } from "../test-support/fake-data-layer";
import type { AdminDeps } from "./core";
import { saveBudgetItem, updateGoal } from "./campaign";
import { markReconciled, recordContribution, voidContribution } from "./contributions";
import { attachExpenseReceipt, recordExpense, voidExpense } from "./expenses";
import { saveMilestone } from "./milestones";
import { savePaymentMethod, setPaymentMethodPublished } from "./payment-methods";
import { addUpdatePhoto, saveUpdate, setUpdatePublished } from "./updates";

const CAMPAIGN = "11111111-1111-4111-8111-111111111111";
const RECORD = "44444444-4444-4444-8444-444444444444";

function deps(
  role: AdminDeps["actor"] extends null
    ? never
    : "owner" | "admin" | "editor" | "auditor",
  gateway = fakeAdminGateway(),
): { deps: AdminDeps; fake: ReturnType<typeof fakeAdminGateway> } {
  return {
    deps: {
      gateway: gateway.gateway,
      logger: fakeLogger(),
      actor: { userId: "55555555-5555-4555-8555-555555555555", role },
    },
    fake: gateway,
  };
}

function noSession(gateway = fakeAdminGateway()): AdminDeps {
  return { gateway: gateway.gateway, logger: fakeLogger(), actor: null };
}

const validExpense = {
  campaignId: CAMPAIGN,
  amount: "1.240.000",
  currency: "ARS",
  spentAt: "2026-08-05",
  concept: "Chapas para el techo",
  category: "materiales",
};

// ── Autorización ────────────────────────────────────────────────────────────
// Es lo primero porque es lo que más importa: una operación sin sesión o con un rol
// insuficiente no llega al puerto. Y "no llega" se afirma mirando `calls`, no sólo
// el resultado: un rechazo que igual escribió es un rechazo que no sirvió.

describe("autorización", () => {
  it("rechaza una operación sin sesión y no toca el puerto (amenaza T7)", async () => {
    const gateway = fakeAdminGateway();
    const result = await recordExpense(noSession(gateway), validExpense);

    expect(result.status).toBe("rejected");
    expect(gateway.calls).toEqual([]);
  });

  it("rechaza a un editor que intenta registrar un gasto", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await recordExpense(editor, validExpense);

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
  });

  it("rechaza a un auditor en toda escritura, incluida la de contenido", async () => {
    const { deps: auditor, fake } = deps("auditor");

    const expense = await recordExpense(auditor, validExpense);
    const update = await saveUpdate(auditor, {
      campaignId: CAMPAIGN,
      slug: "techo-nuevo",
      title: "El techo",
      body: "Se colocaron las chapas.",
    });

    expect(expense.status).toBe("rejected");
    expect(update.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
  });

  it("rechaza a un admin que intenta tocar una cuenta bancaria (amenaza T1)", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await savePaymentMethod(admin, {
      campaignId: CAMPAIGN,
      countryCode: "AR",
      currency: "ARS",
      label: "Transferencia en Argentina",
      fields: [{ label: "CBU", value: "0170099220000067797", copyable: "on" }],
    });

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
  });

  it("deja pasar a owner en la cuenta bancaria", async () => {
    const { deps: owner } = deps("owner");
    const result = await savePaymentMethod(owner, {
      campaignId: CAMPAIGN,
      countryCode: "AR",
      currency: "ARS",
      label: "Transferencia en Argentina",
      fields: [{ label: "CBU", value: "0170099220000067797", copyable: "on" }],
    });

    expect(result.status).toBe("ok");
  });

  it("deja pasar a un editor en contenido", async () => {
    const { deps: editor } = deps("editor");
    const result = await saveUpdate(editor, {
      campaignId: CAMPAIGN,
      slug: "techo-nuevo",
      title: "Empezó el techo",
      body: "Llegaron las chapas y se colocaron las cabriadas.",
    });

    expect(result.status).toBe("ok");
  });
});

// ── Gastos ──────────────────────────────────────────────────────────────────

describe("gastos", () => {
  it("convierte el monto escrito a mano a la unidad mínima", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await recordExpense(admin, validExpense);

    expect(result.status).toBe("ok");
    expect(fake.calls[0]).toMatchObject({
      name: "recordExpense",
      input: { amount: { amountMinor: 124_000_000, currency: "ARS" } },
    });
  });

  it("deja el error del monto en el campo del monto (FR-023)", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await recordExpense(admin, { ...validExpense, amount: "mil pesos" });

    expect(result).toMatchObject({ status: "invalid" });
    expect(result.status === "invalid" ? result.fieldErrors : {}).toHaveProperty(
      "amount",
    );
    expect(fake.calls).toEqual([]);
  });

  it("rechaza una fecha futura", async () => {
    const { deps: admin } = deps("admin");
    const result = await recordExpense(admin, { ...validExpense, spentAt: "2099-01-01" });

    expect(result).toMatchObject({ status: "invalid" });
    expect(result.status === "invalid" ? result.fieldErrors : {}).toHaveProperty(
      "spentAt",
    );
  });

  it("rechaza un monto negativo: un gasto se anula, no se carga al revés", async () => {
    const { deps: admin } = deps("admin");
    const result = await recordExpense(admin, { ...validExpense, amount: "-5000" });

    expect(result.status).toBe("invalid");
  });

  it("registra el gasto en la auditoría con monto, fecha y concepto (FR-016)", async () => {
    const { deps: admin, fake } = deps("admin");
    await recordExpense(admin, validExpense);

    expect(fake.audit).toHaveLength(1);
    expect(fake.audit[0]).toMatchObject({
      action: "expense.created",
      entityTable: "expenses",
      diff: { spentAt: "2026-08-05", concept: "Chapas para el techo" },
    });
  });

  it("exige un motivo de al menos diez caracteres para anular (FR-015)", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await voidExpense(admin, { id: RECORD, reason: "error" });

    expect(result.status).toBe("invalid");
    expect(fake.calls).toEqual([]);
  });

  it("anula con motivo y lo deja en la auditoría", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await voidExpense(admin, {
      id: RECORD,
      reason: "Se cargó dos veces el mismo remito.",
    });

    expect(result.status).toBe("ok");
    expect(fake.audit[0]).toMatchObject({
      action: "expense.voided",
      diff: { reason: "Se cargó dos veces el mismo remito." },
    });
  });

  it("sube el comprobante y lo registra en la auditoría", async () => {
    const { deps: admin, fake } = deps("admin");
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "factura.jpg", {
      type: "image/jpeg",
    });

    const result = await attachExpenseReceipt(admin, { expenseId: RECORD, file });

    expect(result.status).toBe("ok");
    expect(fake.audit[0]).toMatchObject({ action: "expense.receipt_attached" });
  });

  it("pide un archivo cuando no viene ninguno", async () => {
    const { deps: admin } = deps("admin");
    const result = await attachExpenseReceipt(admin, {
      expenseId: RECORD,
      file: "factura.jpg",
    });

    expect(result.status).toBe("invalid");
  });
});

// ── Aportes ─────────────────────────────────────────────────────────────────

describe("aportes", () => {
  it("registra el aporte con su monto convertido", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await recordContribution(admin, {
      campaignId: CAMPAIGN,
      amount: "500.000",
      currency: "ARS",
      receivedAt: "2026-08-01",
    });

    expect(result.status).toBe("ok");
    expect(fake.calls[0]).toMatchObject({
      input: { amount: { amountMinor: 50_000_000, currency: "ARS" } },
    });
  });

  /**
   * La nota de conciliación es lo más cercano a un dato personal que hay en el
   * sistema, y el registro de auditoría lo leen más roles que la tabla de aportes.
   * Se guarda si existe, nunca qué dice (FR-014).
   */
  it("no copia la nota de conciliación al registro de auditoría", async () => {
    const { deps: admin, fake } = deps("admin");
    await recordContribution(admin, {
      campaignId: CAMPAIGN,
      amount: "500.000",
      currency: "ARS",
      receivedAt: "2026-08-01",
      sourceNote: "Transferencia de Marta desde Resistencia",
    });

    expect(JSON.stringify(fake.audit)).not.toContain("Marta");
    expect(fake.audit[0]).toMatchObject({ diff: { hasSourceNote: true } });
  });

  it("marca la conciliación con la fecha dada", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await markReconciled(admin, {
      campaignId: CAMPAIGN,
      reconciledAt: "2026-09-01",
    });

    expect(result.status).toBe("ok");
    expect(fake.audit[0]).toMatchObject({
      action: "campaign.reconciled",
      diff: { reconciledAt: "2026-09-01" },
    });
  });

  it("anula un aporte con motivo", async () => {
    const { deps: admin } = deps("admin");
    const result = await voidContribution(admin, {
      id: RECORD,
      reason: "El banco rechazó la transferencia y volvió atrás.",
    });

    expect(result.status).toBe("ok");
  });
});

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
});

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
