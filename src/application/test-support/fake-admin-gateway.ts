import type { AdminGateway, AuditEntry } from "@/src/domain/ports/admin";

/**
 * El backoffice en memoria.
 *
 * Registra cada llamada en `calls` y guarda las entradas de auditoría en `audit`,
 * que es lo que se afirma en los tests: que la operación llegó al puerto con los
 * datos convertidos, y que dejó rastro. Lo que no hace es simular las policies RLS
 * —eso se prueba con pgTAP, contra una base de verdad— así que un test de acá que
 * "pasa" no dice nada sobre autorización en la base, y por eso existen las dos suites.
 */

export interface FakeGateway {
  readonly gateway: AdminGateway;
  readonly calls: { name: string; input: unknown }[];
  readonly audit: AuditEntry[];
}

export function fakeAdminGateway(
  overrides: Partial<{
    failWith: Error;
    auditFailsWith: Error;
    newId: string;
  }> = {},
): FakeGateway {
  const calls: { name: string; input: unknown }[] = [];
  const audit: AuditEntry[] = [];
  const id = overrides.newId ?? "22222222-2222-4222-8222-222222222222";

  function record<T>(name: string, input: unknown, value: T): Promise<T> {
    calls.push({ name, input });

    if (overrides.failWith !== undefined) {
      return Promise.reject(overrides.failWith);
    }

    return Promise.resolve(value);
  }

  const gateway: AdminGateway = {
    campaign: {
      getCampaign: () => record("getCampaign", null, null),
      listBudgetItems: () => record("listBudgetItems", null, []),
      updateGoal: (input) => record("updateGoal", input, undefined),
      saveBudgetItem: (input) => record("saveBudgetItem", input, id),
    },
    contributions: {
      listContributions: () => record("listContributions", null, []),
      recordContribution: (input) => record("recordContribution", input, id),
      voidContribution: (input) => record("voidContribution", input, undefined),
      markReconciled: (input) => record("markReconciled", input, undefined),
    },
    expenses: {
      listExpenses: () => record("listExpenses", null, []),
      recordExpense: (input) => record("recordExpense", input, id),
      voidExpense: (input) => record("voidExpense", input, undefined),
      uploadReceipt: (input) =>
        record("uploadReceipt", input, { fileName: input.file.name }),
      listReceipts: () => record("listReceipts", null, []),
      findReceipt: () => record("findReceipt", null, null),
      createReceiptLink: (input) =>
        record("createReceiptLink", input, "https://ejemplo.test/firmado"),
    },
    updates: {
      listUpdates: () => record("listUpdates", null, []),
      findUpdate: () => record("findUpdate", null, null),
      saveUpdate: (input) => record("saveUpdate", input, id),
      setUpdatePublished: (input) => record("setUpdatePublished", input, undefined),
      createMedia: (input) =>
        record("createMedia", input, {
          id: "33333333-3333-4333-8333-333333333333",
          url: "https://ejemplo.test/foto.jpg",
          alt: input.alt,
          caption: input.caption,
          credit: input.credit,
          width: 1600,
          height: 1200,
          takenOn: input.takenOn,
        }),
      attachMediaToUpdate: (input) => record("attachMediaToUpdate", input, undefined),
    },
    milestones: {
      listMilestones: () => record("listMilestones", null, []),
      saveMilestone: (input) => record("saveMilestone", input, id),
    },
    paymentMethods: {
      listMethods: () => record("listMethods", null, []),
      saveMethod: (input) => record("saveMethod", input, id),
      setMethodPublished: (input) => record("setMethodPublished", input, undefined),
    },
    audit: {
      append: (input) => {
        calls.push({ name: "audit.append", input });

        if (overrides.auditFailsWith !== undefined) {
          return Promise.reject(overrides.auditFailsWith);
        }

        audit.push({
          id: String(audit.length + 1),
          actorId: null,
          action: input.action,
          entityTable: input.entityTable,
          entityId: input.entityId,
          diff: input.diff,
          occurredAt: "2026-09-09T00:00:00.000Z",
        });

        return Promise.resolve();
      },
      list: () => Promise.resolve(audit),
    },
    roles: {
      listRoles: () => record("listRoles", null, []),
    },
  };

  return { gateway, calls, audit };
}
