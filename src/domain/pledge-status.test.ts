import { describe, expect, it } from "vitest";

import { DomainError } from "./errors";
import {
  isPledgeEvent,
  isPledgeStatus,
  isTerminalPledge,
  nextPledgeStatus,
  PLEDGE_EVENTS,
  PLEDGE_STATUSES,
  type PledgeEvent,
  type PledgeStatus,
} from "./pledge-status";
import { isActivePledge } from "./entities/donation-pledge";

/**
 * Las transiciones legales de una reserva.
 *
 * El diagrama vive también en la base, en las funciones que mueven el contador.
 * Este archivo es el espejo: la interfaz no ofrece "confirmar llegada" sobre una
 * reserva ya cancelada, y un test que nunca falló no demuestra eso.
 */

const TERMINALES: readonly PledgeStatus[] = ["fulfilled", "cancelled", "expired"];

describe("nextPledgeStatus", () => {
  it("de reserved se cumple", () => {
    expect(nextPledgeStatus("reserved", "fulfill")).toBe("fulfilled");
  });

  it("de reserved se cancela", () => {
    expect(nextPledgeStatus("reserved", "cancel")).toBe("cancelled");
  });

  it("de reserved vence", () => {
    expect(nextPledgeStatus("reserved", "expire")).toBe("expired");
  });

  it("no hay una cuarta salida desde reserved", () => {
    expect(PLEDGE_EVENTS).toEqual(["fulfill", "cancel", "expire"]);
    expect(
      new Set(PLEDGE_EVENTS.map((event) => nextPledgeStatus("reserved", event))),
    ).toEqual(new Set(TERMINALES));
  });

  it.each(TERMINALES)("desde %s no se sale", (status) => {
    for (const event of PLEDGE_EVENTS) {
      expect(() => nextPledgeStatus(status, event)).toThrow(DomainError);
    }
  });
});

describe("isTerminalPledge", () => {
  it("reserved no es terminal: todavía se puede cumplir, cancelar o vencer", () => {
    expect(isTerminalPledge("reserved")).toBe(false);
  });

  it.each(TERMINALES)("%s es terminal", (status) => {
    expect(isTerminalPledge(status)).toBe(true);
  });
});

describe("los estados conocidos", () => {
  it("son exactamente los cuatro del enum", () => {
    expect(PLEDGE_STATUSES).toEqual(["reserved", "fulfilled", "cancelled", "expired"]);
  });

  it("cada evento tiene un destino distinto desde reserved", () => {
    const destinations = PLEDGE_EVENTS.map((event: PledgeEvent) =>
      nextPledgeStatus("reserved", event),
    );

    expect(new Set(destinations).size).toBe(PLEDGE_EVENTS.length);
  });
});

describe("isPledgeStatus", () => {
  it("acepta los cuatro y rechaza el resto", () => {
    expect(isPledgeStatus("reserved")).toBe(true);
    expect(isPledgeStatus("fulfilled")).toBe(true);
    expect(isPledgeStatus("cancelled")).toBe(true);
    expect(isPledgeStatus("expired")).toBe(true);
    expect(isPledgeStatus("held")).toBe(false);
    expect(isPledgeStatus(null)).toBe(false);
  });
});

describe("isPledgeEvent", () => {
  it("acepta los tres y rechaza el resto", () => {
    expect(isPledgeEvent("fulfill")).toBe(true);
    expect(isPledgeEvent("cancel")).toBe(true);
    expect(isPledgeEvent("expire")).toBe(true);
    expect(isPledgeEvent("claim")).toBe(false);
  });
});

describe("isActivePledge", () => {
  it("sólo reserved está activa", () => {
    expect(isActivePledge({ status: "reserved" })).toBe(true);
    expect(isActivePledge({ status: "fulfilled" })).toBe(false);
    expect(isActivePledge({ status: "cancelled" })).toBe(false);
    expect(isActivePledge({ status: "expired" })).toBe(false);
  });
});
