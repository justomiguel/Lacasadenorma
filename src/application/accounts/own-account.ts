import { z } from "zod";

import { normalizeDisplayName, type DonorProfile } from "@/src/domain/entities/donor";
import type { OwnPledge } from "@/src/domain/entities/donation-pledge";
import type { AccountPort } from "@/src/domain/ports/accounts";
import type { DonationsPort } from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";
import { LOCALES, type Locale } from "@/src/i18n/locale";

import { accountError, accountOk, type AccountOutcome } from "./outcome";
import { applySocialProfileHints } from "./social-profile";

/**
 * Los tres casos de uso de la propia cuenta: verla, cambiarle las preferencias y
 * borrarla.
 *
 * No pasan por `perform()` como las operaciones del backoffice, y la razón no es
 * que sean más simples: es que `perform()` escribe en `audit_log` por contrato
 * (ADR-020), y el registro de auditoría existe para responder "quién del equipo
 * cambió esto". Una fila que dijera que una persona cambió su propio nombre
 * público sería vigilancia del público disfrazada de rastro, y una que dijera que
 * borró su cuenta sería justo el residuo que el borrado tiene que no dejar
 * (`docs/privacy.md` § Registro de auditoría).
 */

/**
 * Por qué es una unión y no un `port` anulable: "no hay proyecto configurado" y
 * "no hay sesión" se ven distinto en la pantalla —una es un problema del
 * despliegue, la otra es una invitación a ingresar— y ninguno de los dos es un
 * error (principio XII, FR-034).
 */
export type AccountSession =
  | {
      readonly status: "ready";
      readonly port: AccountPort;
      readonly donations: DonationsPort;
    }
  | { readonly status: "not-configured" }
  | { readonly status: "anonymous" };

export interface OwnAccount {
  readonly profile: DonorProfile;
  readonly pledges: readonly OwnPledge[];
}

export interface AccountDeps {
  readonly session: AccountSession;
  readonly logger: Logger;
  /**
   * Se dispara una sola vez, cuando el perfil acaba de nacer. El correo al
   * equipo y a la persona vive acá y **no puede fallar la pantalla**: si el
   * envío no sale, la cuenta ya está creada (FR-233).
   */
  readonly onAccountOpened?: (profile: DonorProfile) => Promise<void>;
}

const profileInput = z.object({
  displayName: z.string().nullable().optional(),
  /** Llega del formulario, así que llega como texto. `"si"` es aparecer anónima. */
  anonymous: z.enum(["si", "no"]),
  locale: z.enum(LOCALES),
});

function readyPort(deps: AccountDeps): AccountPort | AccountOutcome<never> {
  if (deps.session.status === "not-configured") {
    return accountError("notConfigured");
  }

  if (deps.session.status === "anonymous") {
    return accountError("noSession");
  }

  return deps.session.port;
}

function isOutcome(value: unknown): value is AccountOutcome<never> {
  return typeof value === "object" && value !== null && "status" in value;
}

/**
 * Traduce la excepción a un código, y **sólo** la que tiene un motivo que la
 * persona puede accionar. Todo lo demás es `failed` con el detalle en el log:
 * un mensaje de Postgres en pantalla no le dice nada a quien lo lee y sí le dice
 * algo a quien está probando el sitio (amenaza I6).
 */
function describeFailure(
  deps: AccountDeps,
  describe: string,
  error: unknown,
): AccountOutcome<never> {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("rol interno")) {
    return accountError("internalRole");
  }

  deps.logger.error(`No se pudo ${describe}`, { error });

  return accountError("failed");
}

/**
 * El perfil propio, creándolo si es la primera vez que la persona entra.
 *
 * `fallbackLocale` es el idioma de la pantalla desde la que entró, y se usa sólo
 * para la fila nueva: quien se registró en `/en` recibe sus correos en inglés sin
 * haber tenido que elegirlo (FR-232).
 */
export async function getOwnAccount(
  deps: AccountDeps,
  fallbackLocale: Locale,
): Promise<AccountOutcome<OwnAccount>> {
  const port = readyPort(deps);

  if (isOutcome(port)) {
    return port;
  }

  try {
    const { profile, created } = await port.ensureOwnProfile(fallbackLocale);

    if (created && deps.onAccountOpened !== undefined) {
      try {
        await deps.onAccountOpened(profile);
      } catch (error) {
        deps.logger.error("No se pudo avisar el pedido de cuenta", { error });
      }
    }

    try {
      await applySocialProfileHints(port, deps.logger);
    } catch (error) {
      deps.logger.error("No se pudo copiar el perfil de la red", { error });
    }

    const pledges =
      deps.session.status === "ready"
        ? await deps.session.donations.listOwnPledges()
        : [];

    const current = (await port.readOwnProfile()) ?? profile;

    return accountOk({ profile: current, pledges });
  } catch (error) {
    return describeFailure(deps, "leer tu cuenta", error);
  }
}

export async function updateOwnProfile(
  deps: AccountDeps,
  input: unknown,
): Promise<AccountOutcome<DonorProfile>> {
  const port = readyPort(deps);

  if (isOutcome(port)) {
    return port;
  }

  const parsed = profileInput.safeParse(input);

  if (!parsed.success) {
    deps.logger.warn("Preferencias de cuenta con forma inesperada", {
      issues: parsed.error.issues.map((issue) => issue.path.join(".")),
    });

    return accountError("failed");
  }

  const displayName = normalizeDisplayName(parsed.data.displayName);
  const defaultAnonymous = parsed.data.anonymous === "si";

  // La invariante de `data-model.md` §2: pedir aparecer sin nombre no es un dato
  // incompleto, es una contradicción, y la alternativa —publicar un renglón vacío
  // o derivar un nombre del correo— es peor que rechazarlo (FR-230).
  if (!defaultAnonymous && displayName === null) {
    return accountError("displayNameRequired", "displayName");
  }

  try {
    const saved = await port.saveOwnProfile({
      displayName,
      locale: parsed.data.locale,
      defaultAnonymous,
    });

    if (deps.session.status === "ready") {
      await deps.session.donations.updateOwnAppearance({
        isAnonymous: defaultAnonymous,
        displayName,
      });
    }

    return accountOk(saved);
  } catch (error) {
    return describeFailure(deps, "guardar tus preferencias", error);
  }
}

export async function deleteOwnAccount(deps: AccountDeps): Promise<AccountOutcome<null>> {
  const port = readyPort(deps);

  if (isOutcome(port)) {
    return port;
  }

  try {
    await port.deleteOwnAccount();

    return accountOk(null);
  } catch (error) {
    return describeFailure(deps, "borrar tu cuenta", error);
  }
}
