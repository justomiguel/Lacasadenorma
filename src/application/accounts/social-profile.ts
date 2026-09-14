import type { AccountPort } from "@/src/domain/ports/accounts";
import type { Logger } from "@/src/domain/ports/logger";

/**
 * Completa el perfil con lo que mandó la red, sin pisar lo que ya eligió la
 * persona y sin publicarlo: el anonimato default no se toca (ADR-039).
 *
 * Si la foto no se puede bajar, el nombre igual queda. Entrar no depende de
 * Storage ni de un CDN ajeno.
 */
export async function applySocialProfileHints(
  port: AccountPort,
  logger: Logger,
): Promise<void> {
  const current = await port.readOwnProfile();

  if (current === null) {
    return;
  }

  if (current.displayName !== null && current.portraitPath !== null) {
    return;
  }

  const hints = await port.readSocialProfileHints();

  if (hints === null) {
    return;
  }

  if (current.displayName === null && hints.displayName !== null) {
    await port.saveOwnProfile({
      displayName: hints.displayName,
      locale: current.locale,
      defaultAnonymous: current.defaultAnonymous,
    });
  }

  if (current.portraitPath === null && hints.avatarUrl !== null) {
    const saved = await port.importPortraitFromUrl(hints.avatarUrl);

    if (saved === null) {
      logger.warn("No se pudo copiar el retrato de la red", {
        host: hostOf(hints.avatarUrl),
      });
    }
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "desconocido";
  }
}
