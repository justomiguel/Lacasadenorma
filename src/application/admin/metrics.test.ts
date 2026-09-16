import { describe, expect, it } from "vitest";

import { EMPTY_METRICS_FACTS } from "@/src/domain/metrics";
import { money } from "@/src/domain/money";

import { fakeAdminGateway } from "../test-support/fake-admin-gateway";
import { fakeCampaign } from "../test-support/fake-data-layer";
import { deps, noSession } from "./admin-test-helpers";
import { getOwnerMetrics } from "./metrics";

describe("getOwnerMetrics", () => {
  it("rechaza sin sesión y no lee el snapshot", async () => {
    const gateway = fakeAdminGateway();
    const result = await getOwnerMetrics(noSession(gateway));

    expect(result.status).toBe("rejected");
    expect(gateway.calls.map((call) => call.name)).not.toContain("readSnapshot");
  });

  it("rechaza a un admin y no toca el puerto (ADR-047)", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await getOwnerMetrics(admin);

    expect(result.status).toBe("rejected");
    expect(fake.calls.map((call) => call.name)).not.toContain("readSnapshot");
  });

  it("sin campaña informa que no hay nada que medir", async () => {
    const { deps: owner } = deps("owner", fakeAdminGateway({ campaign: null }));
    const result = await getOwnerMetrics(owner);

    expect(result).toEqual({ status: "unavailable", reason: "not-published" });
  });

  it("devuelve el tablero para owner", async () => {
    const { deps: owner } = deps(
      "owner",
      fakeAdminGateway({
        campaign: fakeCampaign,
        metrics: {
          ...EMPTY_METRICS_FACTS,
          contributions: [
            {
              amountMinor: 25_000_000,
              currency: "ARS",
              receivedAt: "2026-09-14",
              voidedAt: null,
            },
          ],
        },
      }),
    );

    const result = await getOwnerMetrics({
      ...owner,
      now: new Date("2026-09-16T12:00:00.000Z"),
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data.headline.received).toEqual(money(25_000_000, "ARS"));
    expect(result.data.weeklyCash).not.toBeNull();
  });

  it("si la lectura falla lo registra y avisa, no finge un tablero vacío", async () => {
    const { deps: owner, fake } = deps(
      "owner",
      fakeAdminGateway({
        campaign: fakeCampaign,
        failWith: new Error("connection refused"),
      }),
    );
    const result = await getOwnerMetrics(owner);

    expect(result).toEqual({ status: "unavailable", reason: "error" });
    expect(fake.gateway).toBeDefined();
  });
});
