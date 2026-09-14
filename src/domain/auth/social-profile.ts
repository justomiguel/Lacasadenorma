import { normalizeDisplayName } from "@/src/domain/entities/donor";

import { socialProviderFromGoTrue } from "./social-providers";

/**
 * Lo que una red manda y este sitio puede usar como propuesta de perfil.
 *
 * No es autorización: el rol sigue saliendo de `app_metadata`. Esto es el
 * nombre y la foto que la persona ya usa en esa red, para no pedírselos de
 * nuevo cuando acaba de entrar con ella (ADR-039).
 */
export interface SocialProfileHints {
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
}

export interface SocialIdentityInput {
  readonly provider: string;
  readonly identity_data?: Record<string, unknown> | null;
}

/**
 * Anfitriones HTTPS de los que se acepta bajar un retrato.
 *
 * `avatar_url` llega del proveedor, no de un formulario, pero GoTrue también
 * lo copia a `user_metadata` y esa columna la puede escribir la propia
 * persona. Sin lista blanca, copiar la foto sería un GET a la URL que alguien
 * ponga: SSRF. El correo nunca entra acá.
 */
const AVATAR_HOST_SUFFIXES = [
  "googleusercontent.com",
  "ggpht.com",
  "fbcdn.net",
  "cdninstagram.com",
  "twimg.com",
  "githubusercontent.com",
  "licdn.com",
  "discordapp.com",
  "discord.com",
  "scdn.co",
  "mzstatic.com",
] as const;

function textField(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];

  return typeof value === "string" ? value : null;
}

export function isTrustedAvatarUrl(url: string): boolean {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") {
    return false;
  }

  const host = parsed.hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(host) || host.includes(":")) {
    return false;
  }

  return AVATAR_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/**
 * El primer proveedor social de la sesión, si hay uno.
 *
 * Se lee `identities[].identity_data`, no `user_metadata`: esa columna la
 * escribe quien tiene la sesión. El correo no es un nombre.
 */
export function socialHintsFromIdentities(
  identities: readonly SocialIdentityInput[] | null | undefined,
): SocialProfileHints | null {
  if (identities === undefined || identities === null) {
    return null;
  }

  for (const identity of identities) {
    if (socialProviderFromGoTrue(identity.provider) === null) {
      continue;
    }

    const data = identity.identity_data ?? {};
    const displayName = normalizeDisplayName(
      textField(data, "full_name") ?? textField(data, "name"),
    );
    const avatarUrl = textField(data, "picture") ?? textField(data, "avatar_url");
    const trustedAvatar =
      avatarUrl !== null && isTrustedAvatarUrl(avatarUrl) ? avatarUrl : null;

    if (displayName === null && trustedAvatar === null) {
      continue;
    }

    return { displayName, avatarUrl: trustedAvatar };
  }

  return null;
}
