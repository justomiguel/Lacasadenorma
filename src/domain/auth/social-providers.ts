/**
 * Redes sociales con las que se puede crear una cuenta.
 *
 * El catálogo es cerrado y vive en el dominio porque **mostrar un botón es una
 * afirmación**: "esta red entra a este sitio". AUTH_SOCIAL_PROVIDERS es texto
 * de entorno, y un nombre que no está acá no se convierte en interfaz. Los IdP
 * de empresa que Auth también habla (Azure, Keycloak, WorkOS) no son redes
 * sociales y no entran. Instagram no tiene login nativo en Supabase Auth.
 *
 * Los ids son los de la marca que se muestra. GoTrue a veces usa otro nombre
 * (`twitter` por X, `linkedin_oidc` por LinkedIn): `supabaseProviderOf` es el
 * puente, para que el entorno y la interfaz hablen igual que la persona.
 */

export const SOCIAL_PROVIDER_IDS = [
  "google",
  "apple",
  "facebook",
  "x",
  "github",
  "gitlab",
  "linkedin",
  "discord",
  "twitch",
  "spotify",
] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number];

const KNOWN = new Set<string>(SOCIAL_PROVIDER_IDS);

/**
 * Nombres que GoTrue o la gente escriben y que acá son otra cosa.
 *
 * `twitter` es el provider del API; la marca es X. `linkedin_oidc` es el
 * flujo vigente; el viejo `linkedin` de OAuth 1 no se usa.
 */
const ALIASES: Record<string, SocialProviderId> = {
  twitter: "x",
  linkedin_oidc: "linkedin",
};

const SUPABASE_PROVIDER: Record<SocialProviderId, string> = {
  google: "google",
  apple: "apple",
  facebook: "facebook",
  x: "twitter",
  github: "github",
  gitlab: "gitlab",
  linkedin: "linkedin_oidc",
  discord: "discord",
  twitch: "twitch",
  spotify: "spotify",
};

export function isSocialProvider(value: string): value is SocialProviderId {
  return KNOWN.has(value);
}

export function supabaseProviderOf(id: SocialProviderId): string {
  return SUPABASE_PROVIDER[id];
}

/**
 * El `provider` que guarda GoTrue en `auth.identities` (`twitter`,
 * `linkedin_oidc`, `google`). Nulo si es correo u otro IdP que no entra.
 */
export function socialProviderFromGoTrue(provider: string): SocialProviderId | null {
  const token = provider.trim().toLowerCase();

  if (token.length === 0 || token === "email") {
    return null;
  }

  const aliased = ALIASES[token];

  if (aliased !== undefined) {
    return aliased;
  }

  if (isSocialProvider(token)) {
    return token;
  }

  for (const id of SOCIAL_PROVIDER_IDS) {
    if (SUPABASE_PROVIDER[id] === token) {
      return id;
    }
  }

  return null;
}

export interface ParsedSocialProviders {
  readonly providers: readonly SocialProviderId[];
  readonly unknown: readonly string[];
}

/**
 * Lee la lista del entorno. Vacía o ausente significa **ningún botón**: no se
 * inventa Google porque es el más común. Un nombre fuera del catálogo no se
 * habilita; queda en `unknown` para que quien configuró se entere.
 */
export function parseSocialProviders(raw: string | undefined): ParsedSocialProviders {
  if (raw === undefined) {
    return { providers: [], unknown: [] };
  }

  const providers: SocialProviderId[] = [];
  const unknown: string[] = [];
  const seen = new Set<SocialProviderId>();

  for (const piece of raw.split(",")) {
    const token = piece.trim().toLowerCase();

    if (token.length === 0) {
      continue;
    }

    const id = ALIASES[token] ?? (isSocialProvider(token) ? token : null);

    if (id === null) {
      unknown.push(token);
      continue;
    }

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    providers.push(id);
  }

  return { providers, unknown };
}
