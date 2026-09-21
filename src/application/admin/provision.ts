import { z } from "zod";

import { perform, type AdminDeps, type AdminResult } from "@/src/application/admin/core";
import { optionalText, requiredText, uuid } from "@/src/application/admin/fields";
import { buildIdentityEmail } from "@/src/application/emails/identity";
import { can } from "@/src/domain/permissions";
import type { EmailSender } from "@/src/domain/ports/email";
import { inventedEmail, localPartFromName } from "@/src/domain/provisioned-email";
import type { Locale } from "@/src/i18n/locale";

export interface ProvisionedDonor {
  readonly userId: string;
  readonly email: string;
  readonly inviteUrl: string;
  readonly invented: boolean;
  readonly alreadyExisted: boolean;
}

export type ConfirmedUserResult =
  | { readonly status: "created"; readonly userId: string }
  | { readonly status: "exists"; readonly userId: string };

export interface DonorAuthPort {
  /**
   * Crea la cuenta **sin confirmar**. El nombre miente: nació cuando el
   * plan pedía correo ya confirmado, y eso no convive con `type: "invite"`.
   * GoTrue confirma al abrir `/cuenta/confirmar`.
   */
  createConfirmedUser(email: string): Promise<ConfirmedUserResult>;
  inviteUrl(input: { email: string; locale: Locale }): Promise<string>;
  listTakenInventedEmails(localPart: string): Promise<readonly string[]>;
}

export interface ProvisionMail {
  readonly sender: EmailSender;
  readonly siteUrl: string;
  readonly record: (input: {
    kind: "account.invite";
    userId: string;
    result: Awaited<ReturnType<EmailSender["send"]>>;
  }) => Promise<void>;
}

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value.length === 0 ? null : value))
  .refine(
    (value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "El correo no es válido.",
  );

const provisionSchema = z.object({
  displayName: requiredText("el nombre", 80),
  email: optionalEmail,
  phone: optionalText(80),
});

const regenerateSchema = z.object({
  userId: uuid("la cuenta"),
});

/**
 * Cargar una cuenta de quien donó por fuera del sitio.
 *
 * El correo de invitación se intenta **después**. Si no sale, la cuenta ya
 * está (como `reviewDonorAccount`). Un mail inventado no se manda.
 */
export async function provisionDonorAccount(
  deps: AdminDeps,
  input: unknown,
  auth: DonorAuthPort,
  mail: ProvisionMail | null,
): Promise<AdminResult<ProvisionedDonor>> {
  const result = await perform({
    deps,
    permission: "donaciones.escribir",
    describe: "provisionar la cuenta",
    schema: provisionSchema,
    input,
    run: async (parsed) => createProvisionedDonor(deps, auth, parsed),
    success: (output) =>
      output.alreadyExisted ? "Esa cuenta ya estaba." : "Cuenta cargada.",
    audit: (_parsed, output) => ({
      action: "donor.provisioned",
      entityTable: "donor_profiles",
      entityId: output.userId,
      diff: { invented: output.invented },
    }),
  });

  if (
    result.status !== "ok" ||
    mail === null ||
    result.value.invented ||
    result.value.alreadyExisted
  ) {
    return result;
  }

  try {
    const message = buildIdentityEmail("account.invite", {
      userId: result.value.userId,
      recipient: result.value.email,
      locale: "es",
      confirmUrl: result.value.inviteUrl,
      tokenStamp: tokenStampFrom(result.value.inviteUrl),
    });
    const sent = await mail.sender.send("account.invite", message);

    await mail.record({
      kind: "account.invite",
      userId: result.value.userId,
      result: sent,
    });
  } catch (error) {
    deps.logger.error("No se pudo avisar la cuenta cargada", { error });
  }

  return result;
}

/**
 * Otro enlace de invitación. El correo sale de `contactOf`, no del formulario.
 * No muta la ficha: no deja rastro de auditoría.
 */
export async function regenerateDonorInvite(
  deps: AdminDeps,
  input: unknown,
  auth: DonorAuthPort,
): Promise<AdminResult<{ inviteUrl: string }>> {
  const { actor, logger } = deps;

  if (actor === null) {
    return { status: "rejected", message: "Tu sesión venció. Volvé a entrar." };
  }

  if (!can(actor.role, "donaciones.escribir")) {
    logger.warn("Operación del backoffice rechazada por permisos", {
      permission: "donaciones.escribir",
      role: actor.role,
      describe: "regenerar el enlace",
    });

    return { status: "rejected", message: "Tu rol no permite hacer esto." };
  }

  const parsed = regenerateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "invalid",
      message: "Revisá los datos marcados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  try {
    const email = await deps.gateway.donors.contactOf(parsed.data.userId);

    if (email === null || email.length === 0) {
      return {
        status: "failed",
        message: "Esta cuenta no tiene correo. No se puede armar un enlace.",
      };
    }

    const inviteUrl = await auth.inviteUrl({
      email,
      locale: "es",
    });

    return { status: "ok", value: { inviteUrl }, message: "Enlace listo." };
  } catch (error) {
    logger.error("No se pudo regenerar el enlace", { error });

    return {
      status: "failed",
      message:
        "No se pudo regenerar el enlace. El detalle quedó en el registro del servidor.",
    };
  }
}

async function createProvisionedDonor(
  deps: AdminDeps,
  auth: DonorAuthPort,
  parsed: z.infer<typeof provisionSchema>,
): Promise<ProvisionedDonor> {
  if (parsed.email === null) {
    return provisionInvented(deps, auth, parsed);
  }

  return provisionTyped(deps, auth, parsed, parsed.email);
}

async function provisionTyped(
  deps: AdminDeps,
  auth: DonorAuthPort,
  parsed: z.infer<typeof provisionSchema>,
  email: string,
): Promise<ProvisionedDonor> {
  const created = await auth.createConfirmedUser(email);

  if (created.status === "exists") {
    const account = await deps.gateway.donors.getAccount(created.userId);

    if (account !== null) {
      return {
        userId: created.userId,
        email,
        inviteUrl: "",
        invented: false,
        alreadyExisted: true,
      };
    }
  }

  return finishProvision(deps, auth, parsed, created.userId, email, false);
}

async function provisionInvented(
  deps: AdminDeps,
  auth: DonorAuthPort,
  parsed: z.infer<typeof provisionSchema>,
): Promise<ProvisionedDonor> {
  const taken = new Set(
    await auth.listTakenInventedEmails(localPartFromName(parsed.displayName)),
  );
  let email = inventedEmail(parsed.displayName, taken);
  let created = await auth.createConfirmedUser(email);

  if (created.status === "exists") {
    const retried = await retryInventedUser(auth, parsed.displayName, email, taken);
    created = retried.created;
    email = retried.email;
  }

  return finishProvision(deps, auth, parsed, created.userId, email, true);
}

async function finishProvision(
  deps: AdminDeps,
  auth: DonorAuthPort,
  parsed: z.infer<typeof provisionSchema>,
  userId: string,
  email: string,
  invented: boolean,
): Promise<ProvisionedDonor> {
  await deps.gateway.donors.provisionProfile({
    userId,
    displayName: parsed.displayName,
    phone: parsed.phone,
  });

  return {
    userId,
    email,
    inviteUrl: await auth.inviteUrl({ email, locale: "es" }),
    invented,
    alreadyExisted: false,
  };
}

async function retryInventedUser(
  auth: DonorAuthPort,
  displayName: string,
  firstEmail: string,
  taken: Set<string>,
): Promise<{
  created: Extract<ConfirmedUserResult, { status: "created" }>;
  email: string;
}> {
  let email = firstEmail;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    taken.add(email);
    email = inventedEmail(displayName, taken);
    const created = await auth.createConfirmedUser(email);

    if (created.status === "created") {
      return { created, email };
    }
  }

  throw new Error("No se pudo inventar un correo libre.");
}

function tokenStampFrom(inviteUrl: string): string {
  const token = URL.canParse(inviteUrl)
    ? (new URL(inviteUrl).searchParams.get("token_hash") ?? inviteUrl)
    : inviteUrl;

  return token.slice(0, 8);
}

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key = typeof field === "string" ? field : "_";

    errors[key] ??= issue.message;
  }

  return errors;
}
