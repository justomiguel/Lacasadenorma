import type { SocialProfileHints } from "@/src/domain/auth/social-profile";
import type { DonorProfile } from "@/src/domain/entities/donor";
import type { OwnPledge } from "@/src/domain/entities/donation-pledge";
import type { AccountPort } from "@/src/domain/ports/accounts";
import type { ClaimInput, DonationsPort } from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";

import type { AccountDeps } from "./own-account";

/** El sujeto de las pruebas de cuenta. No es una persona real. */
export const FAKE_ACCOUNT_USER_ID = "00000000-0000-4000-8000-000000000001";

export function fakeProfile(overrides: Partial<DonorProfile> = {}): DonorProfile {
  return {
    userId: FAKE_ACCOUNT_USER_ID,
    displayName: null,
    locale: "es",
    defaultAnonymous: true,
    approvalStatus: "pending",
    portraitPath: null,
    ...overrides,
  };
}

export class FakeAccountPort implements AccountPort {
  profile: DonorProfile | null = null;
  deleted = false;
  failWith: Error | null = null;
  uploadedName: string | null = null;
  ensureCalls = 0;
  socialHints: SocialProfileHints | null = null;
  importedPortraitFrom: string | null = null;
  failPortraitImport = false;

  async readOwnProfile(): Promise<DonorProfile | null> {
    this.raiseIfAsked();

    return this.profile;
  }

  async ensureOwnProfile(fallbackLocale: "es" | "en"): Promise<{
    profile: DonorProfile;
    created: boolean;
  }> {
    this.ensureCalls += 1;
    this.raiseIfAsked();

    if (this.profile !== null) {
      return { profile: this.profile, created: false };
    }

    this.profile = fakeProfile({ locale: fallbackLocale });

    return { profile: this.profile, created: true };
  }

  async readSocialProfileHints(): Promise<SocialProfileHints | null> {
    this.raiseIfAsked();

    return this.socialHints;
  }

  async importPortraitFromUrl(url: string): Promise<DonorProfile | null> {
    this.raiseIfAsked();

    if (this.failPortraitImport) {
      return null;
    }

    this.importedPortraitFrom = url;
    this.profile = fakeProfile({
      ...(this.profile ?? fakeProfile()),
      portraitPath: `${FAKE_ACCOUNT_USER_ID}/retrato.jpg`,
    });

    return this.profile;
  }

  async saveOwnProfile(
    next: Pick<DonorProfile, "displayName" | "locale" | "defaultAnonymous">,
  ): Promise<DonorProfile> {
    this.raiseIfAsked();

    this.profile = fakeProfile({
      approvalStatus: this.profile?.approvalStatus ?? "pending",
      portraitPath: this.profile?.portraitPath ?? null,
      ...next,
    });

    return this.profile;
  }

  async saveOwnPortrait(file: File): Promise<DonorProfile> {
    this.raiseIfAsked();

    this.profile = fakeProfile({
      ...(this.profile ?? fakeProfile()),
      portraitPath: `${FAKE_ACCOUNT_USER_ID}/retrato.png`,
    });
    this.uploadedName = file.name;

    return this.profile;
  }

  async removeOwnPortrait(): Promise<DonorProfile> {
    this.raiseIfAsked();

    this.profile = fakeProfile({
      ...(this.profile ?? fakeProfile()),
      portraitPath: null,
    });

    return this.profile;
  }

  async readOwnPortraitFile(): Promise<{
    bytes: ArrayBuffer;
    mimeType: string;
  } | null> {
    this.raiseIfAsked();

    return this.profile?.portraitPath === null || this.profile === null
      ? null
      : { bytes: new ArrayBuffer(0), mimeType: "image/png" };
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

export class FakeDonationsPort implements DonationsPort {
  pledges: OwnPledge[] = [];
  appearance: { isAnonymous: boolean; displayName: string | null } | null = null;

  async claimItem(_input: ClaimInput): Promise<OwnPledge> {
    throw new Error("no se reserva desde esta prueba");
  }

  async listOwnPledges(): Promise<readonly OwnPledge[]> {
    return this.pledges;
  }

  async cancelOwnPledge(): Promise<void> {
    return;
  }

  async updateOwnAppearance(next: {
    isAnonymous: boolean;
    displayName: string | null;
  }): Promise<void> {
    this.appearance = next;
  }
}

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export function fakeAccountDeps(
  port: FakeAccountPort,
  donations: DonationsPort,
  state: "ready" | "anonymous" | "not-configured" = "ready",
): AccountDeps {
  if (state === "ready") {
    return { session: { status: "ready", port, donations }, logger: silentLogger };
  }

  return { session: { status: state }, logger: silentLogger };
}
