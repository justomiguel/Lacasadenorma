import { describe, expect, it } from "vitest";

import { DomainError } from "./errors";
import {
  isPledgeEvent,
  isPledgeStatus,
  isTerminalPledge,
  nextPledgeStatus,
  PLEDGE_EVENTS,
  PLEDGE_STATUSES,
} from "./pledge-status";
import {
  canEditPledge,
  canStaffReleasePledge,
  isActivePledge,
  isPledgePastHold,
  isVisibleOwnPledge,
} from "./entities/donation-pledge";

/**
 * Las transiciones legales de una reserva.
 *
 * El diagrama vive también en la base, en las funciones que mueven el contador.
 * Este archivo es el espejo: la interfaz no ofrece "confirmar llegada" sobre una
 * reserva que todavía no aceptaron.
 */

const CERRADAS_SIN_SALIDA = ["cancelled", "expired"] as const;

describe("nextPledgeStatus", () => {
  it("de reserved se acepta", () => {
    expect(nextPledgeStatus("reserved", "accept")).toBe("accepted");
  });

  it("de reserved se cancela", () => {
    expect(nextPledgeStatus("reserved", "cancel")).toBe("cancelled");
  });

  it("de reserved vence", () => {
    expect(nextPledgeStatus("reserved", "expire")).toBe("expired");
  });

  it("de reserved no se cumple: no se salta el sí", () => {
    expect(() => nextPledgeStatus("reserved", "fulfill")).toThrow(DomainError);
  });

  it("de accepted se cumple", () => {
    expect(nextPledgeStatus("accepted", "fulfill")).toBe("fulfilled");
  });

  it("de accepted se cancela: el admin deshace el sí", () => {
    expect(nextPledgeStatus("accepted", "cancel")).toBe("cancelled");
  });

  it.each(["accept", "expire"] as const)("accepted no admite %s", (event) => {
    expect(() => nextPledgeStatus("accepted", event)).toThrow(DomainError);
  });

  it("de fulfilled se cancela", () => {
    expect(nextPledgeStatus("fulfilled", "cancel")).toBe("cancelled");
  });

  it.each(["accept", "fulfill", "expire"] as const)(
    "fulfilled no admite %s",
    (event) => {
      expect(() => nextPledgeStatus("fulfilled", event)).toThrow(DomainError);
    },
  );

  it.each(CERRADAS_SIN_SALIDA)("desde %s no se sale", (status) => {
    for (const event of PLEDGE_EVENTS) {
      expect(() => nextPledgeStatus(status, event)).toThrow(DomainError);
    }
  });
});

describe("isTerminalPledge", () => {
  it("reserved no es terminal", () => {
    expect(isTerminalPledge("reserved")).toBe(false);
  });

  it("accepted no es terminal", () => {
    expect(isTerminalPledge("accepted")).toBe(false);
  });

  it("fulfilled no es terminal: el admin puede revertir", () => {
    expect(isTerminalPledge("fulfilled")).toBe(false);
  });

  it.each(CERRADAS_SIN_SALIDA)("%s es terminal", (status) => {
    expect(isTerminalPledge(status)).toBe(true);
  });
});

describe("canStaffReleasePledge", () => {
  it("reserved, accepted y fulfilled se sueltan; cancelled y expired no", () => {
    expect(canStaffReleasePledge("reserved")).toBe(true);
    expect(canStaffReleasePledge("accepted")).toBe(true);
    expect(canStaffReleasePledge("fulfilled")).toBe(true);
    expect(canStaffReleasePledge("cancelled")).toBe(false);
    expect(canStaffReleasePledge("expired")).toBe(false);
  });
});

describe("isPledgePastHold", () => {
  it("es verdadero cuando ya pasaron los 14 días", () => {
    expect(
      isPledgePastHold("2026-09-01T00:00:00.000Z", new Date("2026-09-20T12:00:00.000Z")),
    ).toBe(true);
  });

  it("es falso si el plazo todavía no llegó", () => {
    expect(
      isPledgePastHold("2026-09-21T00:00:00.000Z", new Date("2026-09-20T12:00:00.000Z")),
    ).toBe(false);
  });
});

describe("los estados conocidos", () => {
  it("son exactamente los cinco del enum", () => {
    expect(PLEDGE_STATUSES).toEqual([
      "reserved",
      "accepted",
      "fulfilled",
      "cancelled",
      "expired",
    ]);
  });
});

describe("isPledgeStatus", () => {
  it("acepta los cinco y rechaza el resto", () => {
    expect(isPledgeStatus("reserved")).toBe(true);
    expect(isPledgeStatus("accepted")).toBe(true);
    expect(isPledgeStatus("fulfilled")).toBe(true);
    expect(isPledgeStatus("cancelled")).toBe(true);
    expect(isPledgeStatus("expired")).toBe(true);
    expect(isPledgeStatus("taken")).toBe(false);
    expect(isPledgeStatus("held")).toBe(false);
    expect(isPledgeStatus(null)).toBe(false);
  });
});

describe("isPledgeEvent", () => {
  it("acepta los cuatro y rechaza el resto", () => {
    expect(isPledgeEvent("accept")).toBe(true);
    expect(isPledgeEvent("fulfill")).toBe(true);
    expect(isPledgeEvent("cancel")).toBe(true);
    expect(isPledgeEvent("expire")).toBe(true);
    expect(isPledgeEvent("claim")).toBe(false);
  });
});

describe("isActivePledge", () => {
  it("reserved y accepted están en curso; el resto no", () => {
    expect(isActivePledge({ status: "reserved" })).toBe(true);
    expect(isActivePledge({ status: "accepted" })).toBe(true);
    expect(isActivePledge({ status: "fulfilled" })).toBe(false);
    expect(isActivePledge({ status: "cancelled" })).toBe(false);
    expect(isActivePledge({ status: "expired" })).toBe(false);
  });
});

describe("isVisibleOwnPledge", () => {
  it("reserved, accepted y fulfilled se listan; cancelled y expired no", () => {
    expect(isVisibleOwnPledge({ status: "reserved" })).toBe(true);
    expect(isVisibleOwnPledge({ status: "accepted" })).toBe(true);
    expect(isVisibleOwnPledge({ status: "fulfilled" })).toBe(true);
    expect(isVisibleOwnPledge({ status: "cancelled" })).toBe(false);
    expect(isVisibleOwnPledge({ status: "expired" })).toBe(false);
  });
});

describe("canEditPledge", () => {
  it("solo reserved se edita", () => {
    expect(canEditPledge("reserved")).toBe(true);
    expect(canEditPledge("accepted")).toBe(false);
    expect(canEditPledge("fulfilled")).toBe(false);
    expect(canEditPledge("cancelled")).toBe(false);
    expect(canEditPledge("expired")).toBe(false);
  });
});
