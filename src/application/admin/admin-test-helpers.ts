import { fakeAdminGateway } from "../test-support/fake-admin-gateway";
import { fakeLogger } from "../test-support/fake-data-layer";
import type { AdminDeps } from "./core";

export const CAMPAIGN = "11111111-1111-4111-8111-111111111111";
export const RECORD = "44444444-4444-4444-8444-444444444444";

export function deps(
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

export function noSession(gateway = fakeAdminGateway()): AdminDeps {
  return { gateway: gateway.gateway, logger: fakeLogger(), actor: null };
}

export const validExpense = {
  campaignId: CAMPAIGN,
  amount: "1.240.000",
  currency: "ARS",
  spentAt: "2026-08-05",
  concept: "Chapas para el techo",
  category: "materiales",
};
