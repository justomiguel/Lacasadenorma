import { randomBytes } from "node:crypto";

import {
  confirmationLink,
  type IdentityLinkType,
} from "@/src/application/emails/identity";
import type { DonorAuthPort } from "@/src/application/admin/provision";
import { INVENTED_EMAIL_DOMAIN } from "@/src/domain/provisioned-email";
import { localizeHref, type Locale } from "@/src/i18n/locale";

import { createAuthAdminClient } from "./auth-admin";
import { QueryError } from "./admin/query";

export type DonorAccessLinkType = Extract<IdentityLinkType, "invite" | "recovery">;

export type DonorLinkGenerate = (type: DonorAccessLinkType) => Promise<{
  data: { properties: { hashed_token: string } };
  error: { code?: string | undefined; message: string } | null;
}>;

/**
 * Invite si el correo no está confirmado (o GoTrue puede crear la cuenta).
 * Recovery si ya lo abrieron: invite entonces 422 `email_exists`.
 */
export async function donorAccessUrl(
  generate: DonorLinkGenerate,
  input: { siteUrl: string; locale: Locale },
): Promise<string> {
  const first = await generate("invite");

  if (first.error === null) {
    return urlFromLink(first.data.properties.hashed_token, input, "invite");
  }

  if (first.error.code !== "email_exists") {
    throw new QueryError("generar el enlace de invitación", first.error);
  }

  const second = await generate("recovery");

  if (second.error !== null) {
    throw new QueryError("generar el enlace de invitación", second.error);
  }

  return urlFromLink(second.data.properties.hashed_token, input, "recovery");
}

function urlFromLink(
  tokenHash: string,
  input: { siteUrl: string; locale: Locale },
  type: DonorAccessLinkType,
): string {
  if (tokenHash.length === 0) {
    throw new QueryError("generar el enlace de invitación", {
      message: "generateLink no devolvió token_hash",
    });
  }

  return confirmationLink(input.siteUrl, input.locale, tokenHash, type);
}

/**
 * Auth Admin para cargar una cuenta de quien donó por fuera.
 *
 * `createUser` + `generateLink` (invite, o recovery si ya confirmaron)
 * están en GoTrueAdminApi. No hay `getUserByEmail`: si el correo ya
 * existe, se busca con `listUsers`.
 *
 * La cuenta nace **sin confirmar**. `createConfirmedUser` es el nombre
 * histórico del puerto: GoTrue rechaza invite (422 `email_exists`) si el
 * correo ya está confirmado. Quien abre `/cuenta/confirmar` confirma.
 * «Volver a generar» entonces cae a recovery.
 */
export function createDonorAuth(siteUrl: string): DonorAuthPort | null {
  const admin = createAuthAdminClient();

  if (admin === null) {
    return null;
  }

  return {
    async createConfirmedUser(email) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: randomBytes(32).toString("base64url"),
        email_confirm: false,
      });

      if (error === null) {
        return { status: "created", userId: data.user.id };
      }

      if (error.code !== "email_exists" && error.code !== "user_already_exists") {
        throw new QueryError("crear la cuenta", error);
      }

      const userId = await findUserIdByEmail(admin, email);

      return { status: "exists", userId };
    },

    async inviteUrl({ email, locale }) {
      const redirectTo = confirmationRedirect(siteUrl, locale);

      return donorAccessUrl(
        async (type) => {
          const { data, error } = await admin.auth.admin.generateLink({
            type,
            email,
            options: { redirectTo },
          });

          return {
            data: {
              properties: { hashed_token: data.properties?.hashed_token ?? "" },
            },
            error,
          };
        },
        { siteUrl, locale },
      );
    },

    async listTakenInventedEmails(localPart) {
      const suffix = `@${INVENTED_EMAIL_DOMAIN}`;
      const taken: string[] = [];

      for await (const user of listAuthUsers(admin)) {
        const email = user.email;

        if (
          email !== undefined &&
          email.endsWith(suffix) &&
          email.startsWith(localPart)
        ) {
          taken.push(email);
        }
      }

      return taken;
    },
  };
}

async function findUserIdByEmail(
  admin: NonNullable<ReturnType<typeof createAuthAdminClient>>,
  email: string,
): Promise<string> {
  const wanted = email.trim().toLowerCase();

  for await (const user of listAuthUsers(admin)) {
    if (user.email?.trim().toLowerCase() === wanted) {
      return user.id;
    }
  }

  throw new QueryError("crear la cuenta", {
    message: "el correo ya existía y no se pudo resolver el usuario",
    code: "email_exists",
  });
}

async function* listAuthUsers(
  admin: NonNullable<ReturnType<typeof createAuthAdminClient>>,
) {
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 50,
    });

    if (error !== null) {
      throw new QueryError("leer las cuentas de Auth", error);
    }

    for (const user of data.users) {
      yield user;
    }

    if (data.users.length < 50) {
      return;
    }

    page += 1;
  }
}

function confirmationRedirect(siteUrl: string, locale: Locale): string {
  return `${siteUrl}${localizeHref("/cuenta/confirmar", locale)}`;
}
