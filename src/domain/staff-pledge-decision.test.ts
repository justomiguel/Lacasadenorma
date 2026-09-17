import { describe, expect, it } from "vitest";

import {
  isStaffPledgeDecision,
  STAFF_CONTACT_REJECT_REASON,
  staffPledgeDecisionPath,
} from "./staff-pledge-decision";

const PLEDGE = "40000000-0000-4000-8000-000000000001";

describe("staffPledgeDecisionPath", () => {
  it("el sí y el no son dos rutas de sesión, no un token", () => {
    expect(staffPledgeDecisionPath(PLEDGE, "si")).toBe(
      `/admin/donaciones/decidir/${PLEDGE}/si`,
    );
    expect(staffPledgeDecisionPath(PLEDGE, "no")).toBe(
      `/admin/donaciones/decidir/${PLEDGE}/no`,
    );
    expect(staffPledgeDecisionPath(PLEDGE, "si")).not.toMatch(
      /token|token_hash|access_token/i,
    );
  });

  it("no acepta otra decisión", () => {
    expect(isStaffPledgeDecision("si")).toBe(true);
    expect(isStaffPledgeDecision("no")).toBe(true);
    expect(isStaffPledgeDecision("yes")).toBe(false);
    expect(isStaffPledgeDecision("")).toBe(false);
  });

  it("el no tiene un motivo fijo, no un hueco", () => {
    expect(STAFF_CONTACT_REJECT_REASON.length).toBeGreaterThan(8);
    expect(STAFF_CONTACT_REJECT_REASON).not.toMatch(/^\s*$/);
  });
});
