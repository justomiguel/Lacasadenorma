import { beforeEach, describe, expect, it } from "vitest";

import type { DonorProfile } from "@/src/domain/entities/donor";
import type { OwnPledge } from "@/src/domain/entities/donation-pledge";
import type { AccountPort } from "@/src/domain/ports/accounts";
import type { ClaimInput, DonationsPort } from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";

import {
  deleteOwnAccount,
  getOwnAccount,
  updateOwnProfile,
  type AccountDeps,
} from "./own-account";

class FakeAccountPort implements AccountPort {
  profile: DonorProfile | null = null;
  deleted = false;
  failWith: Error | null = null;

  async readOwnProfile(): Promise<DonorProfile | null> {
    this.raiseIfAsked();

    return this.profile;
  }

  async ensureOwnProfile(fallbackLocale: "es" | "en"): Promise<{
    profile: DonorProfile;
    created: boolean;
  }> {
    this.raiseIfAsked();

    if (this.profile !== null) {
      return { profile: this.profile, created: false };
    }

    this.profile = {
      userId: "00000000-0000-4000-8000-000000000001",
      displayName: null,
      locale: fallbackLocale,
      defaultAnonymous: true,
      approvalStatus: "pending",
    };

    return { profile: this.profile, created: true };
  }

  async saveOwnProfile(
    next: Pick<DonorProfile, "displayName" | "locale" | "defaultAnonymous">,
  ): Promise<DonorProfile> {
    this.raiseIfAsked();

    this.profile = {
      userId: "00000000-0000-4000-8000-000000000001",
      approvalStatus: this.profile?.approvalStatus ?? "pending",
      ...next,
    };

    return this.profile;
  }

  async deleteOwnAccount(): Promise<void> {
    this.raiseIfAsked();

    this.deleted = true;
  }

  private raiseIfAsked(): void {
    if (this.failWith !== null) {
      throw this.failWith;
    }
  }
}

class FakeDonationsPort implements DonationsPort {
  pledges: OwnPledge[] = [];

  async claimItem(_input: ClaimInput): Promise<OwnPledge> {
    throw new Error("no se reserva desde esta prueba");
  }

  async listOwnPledges(): Promise<readonly OwnPledge[]> {
    return this.pledges;
  }

  async cancelOwnPledge(): Promise<void> {
    return;
  }
}

const silent: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

let port: FakeAccountPort;
let donations: FakeDonationsPort;

function deps(state: "ready" | "anonymous" | "not-configured" = "ready"): AccountDeps {
  if (state === "ready") {
    return {
      session: { status: "ready", port, donations },
      logger: silent,
    };
  }

  return { session: { status: state }, logger: silent };
}

beforeEach(() => {
  port = new FakeAccountPort();
  donations = new FakeDonationsPort();
});

describe("getOwnAccount", () => {
  it("crea el perfil la primera vez, en el idioma de la pantalla", async () => {
    const result = await getOwnAccount(deps(), "en");

    expect(result).toEqual({
      status: "ok",
      value: {
        profile: {
          userId: "00000000-0000-4000-8000-000000000001",
          displayName: null,
          locale: "en",
          defaultAnonymous: true,
          approvalStatus: "pending",
        },
        pledges: [],
      },
    });
  });

  it("sin sesión no hay cuenta propia, y lo dice con su propio código", async () => {
    const result = await getOwnAccount(deps("anonymous"), "es");

    expect(result).toEqual({ status: "error", code: "noSession", field: null });
  });

  it("sin proyecto configurado no confunde el motivo", async () => {
    const result = await getOwnAccount(deps("not-configured"), "es");

    expect(result).toEqual({ status: "error", code: "notConfigured", field: null });
  });

  it("una falla de la base no se filtra al mensaje", async () => {
    port.failWith = new Error("connection to server at 10.0.0.3 failed");

    const result = await getOwnAccount(deps(), "es");

    expect(result).toEqual({ status: "error", code: "failed", field: null });
  });

  it("al nacer avisa, y si el aviso falla la cuenta igual queda", async () => {
    const opened: DonorProfile[] = [];
    const depsConAviso: AccountDeps = {
      ...deps(),
      onAccountOpened: async (profile) => {
        opened.push(profile);
      },
    };

    const result = await getOwnAccount(depsConAviso, "es");

    expect(result.status).toBe("ok");
    expect(opened).toHaveLength(1);
    expect(opened[0]?.approvalStatus).toBe("pending");

    const segunda = await getOwnAccount(depsConAviso, "es");

    expect(segunda.status).toBe("ok");
    expect(opened).toHaveLength(1);
  });

  it("si el aviso falla, la cuenta igual queda", async () => {
    const result = await getOwnAccount(
      {
        ...deps(),
        onAccountOpened: async () => {
          throw new Error("resend caído");
        },
      },
      "es",
    );

    expect(result.status).toBe("ok");
    expect(port.profile?.approvalStatus).toBe("pending");
  });

  it("trae las reservas propias junto con el perfil", async () => {
    donations.pledges = [
      {
        id: "30000000-0000-4000-8000-000000000001",
        itemId: "ab700000-0000-4000-8000-000000000003",
        itemTitle: "Chapas del techo",
        quantity: 2,
        status: "reserved",
        isAnonymous: true,
        donorDisplayName: null,
        donorNote: null,
        expiresAt: "2026-09-27T00:00:00.000Z",
        remindedAt: null,
        fulfilledAt: null,
        cancelledAt: null,
        cancelReason: null,
        createdAt: "2026-09-13T00:00:00.000Z",
      },
    ];

    const result = await getOwnAccount(deps(), "es");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.value.pledges).toHaveLength(1);
    expect(result.value.pledges[0]?.itemTitle).toBe("Chapas del techo");
  });
});

describe("updateOwnProfile", () => {
  it("guarda el nombre, el idioma y la decisión de aparecer", async () => {
    const result = await updateOwnProfile(deps(), {
      displayName: "  Vecina de la cuadra  ",
      anonymous: "no",
      locale: "es",
    });

    expect(result).toEqual({
      status: "ok",
      value: {
        userId: "00000000-0000-4000-8000-000000000001",
        displayName: "Vecina de la cuadra",
        locale: "es",
        defaultAnonymous: false,
        approvalStatus: "pending",
      },
    });
  });

  it("un nombre de espacios es no haber elegido ninguno", async () => {
    const result = await updateOwnProfile(deps(), {
      displayName: "   ",
      anonymous: "si",
      locale: "es",
    });

    expect(result).toEqual({
      status: "ok",
      value: {
        userId: "00000000-0000-4000-8000-000000000001",
        displayName: null,
        locale: "es",
        defaultAnonymous: true,
        approvalStatus: "pending",
      },
    });
  });

  it("pedir aparecer sin nombre se rechaza señalando el campo", async () => {
    const result = await updateOwnProfile(deps(), {
      displayName: "",
      anonymous: "no",
      locale: "es",
    });

    expect(result).toEqual({
      status: "error",
      code: "displayNameRequired",
      field: "displayName",
    });
    expect(port.profile).toBeNull();
  });

  it("un idioma que el sitio no publica no se guarda", async () => {
    const result = await updateOwnProfile(deps(), {
      displayName: null,
      anonymous: "si",
      locale: "pt",
    });

    expect(result).toEqual({ status: "error", code: "failed", field: null });
    expect(port.profile).toBeNull();
  });

  it("sin sesión no guarda nada", async () => {
    const result = await updateOwnProfile(deps("anonymous"), {
      displayName: "Quien ayuda",
      anonymous: "no",
      locale: "es",
    });

    expect(result).toEqual({ status: "error", code: "noSession", field: null });
    expect(port.profile).toBeNull();
  });
});

describe("deleteOwnAccount", () => {
  it("borra la cuenta sin pedir nada más que la sesión", async () => {
    const result = await deleteOwnAccount(deps());

    expect(result.status).toBe("ok");
    expect(port.deleted).toBe(true);
  });

  it("una cuenta con rol interno recibe el motivo, no un error genérico", async () => {
    port.failWith = Object.assign(
      new Error(
        "Una cuenta con rol interno no se borra desde /cuenta: primero hay que quitarle el rol.",
      ),
      { code: "P0001" },
    );

    const result = await deleteOwnAccount(deps());

    expect(result).toEqual({ status: "error", code: "internalRole", field: null });
    expect(port.deleted).toBe(false);
  });
});
