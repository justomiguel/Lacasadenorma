import type { Locale } from "@/src/i18n/locale";

/**
 * El perfil de una persona que dona, que es el único dato personal que este
 * proyecto guarda por decisión propia (ADR-027).
 *
 * Lo que **no** está acá es tan importante como lo que está: no hay correo. El
 * correo vive en `auth.users` y lo administra Supabase; copiarlo a una tabla de
 * `public` lo pondría al alcance de cualquier policy mal escrita, y el muro de
 * donantes no necesita el correo para nada. Quien necesita contactar a alguien
 * por una entrega lo hace desde el backoffice, con `donaciones.leer`.
 *
 * `displayName` es nulo hasta que hay un nombre: el que la persona escribe, o el
 * que mandó la red con la que entró. **No se deriva del correo.** Convertir
 * `norma.perez@ejemplo.com` en "Norma Pérez" es exactamente el tipo de
 * conveniencia que publica un apellido que nadie pidió publicar.
 */
export const APPROVAL_STATUSES = ["pending", "approved", "declined"] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface DonorProfile {
  readonly userId: string;
  readonly displayName: string | null;
  readonly locale: Locale;
  readonly defaultAnonymous: boolean;
  readonly approvalStatus: ApprovalStatus;
  /** Ruta en el bucket privado `avatares`. Nulo = no subió foto. No se publica. */
  readonly portraitPath: string | null;
}

export const ANONYMOUS_BY_DEFAULT = true;

/** Confirmar el correo no es habilitación. Habilitar o rechazar sigue siendo del equipo (ADR-033). */
export const PENDING_BY_DEFAULT: ApprovalStatus = "pending";

/**
 * Un nombre son caracteres, no espacios.
 *
 * Recorta los bordes y colapsa a `null` lo que queda vacío, que es la forma que
 * la base entiende como "no eligió ninguno". Por dentro no toca nada: "Vecina
 * de la cuadra" es un nombre público válido y perfectamente elegido.
 */
export function normalizeDisplayName(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const trimmed = raw.trim();

  return trimmed.length === 0 ? null : trimmed;
}

/** El nombre que la persona eligió, o nulo si no eligió ninguno. */
export function displayNameOf(profile: DonorProfile): string | null {
  return normalizeDisplayName(profile.displayName);
}

/**
 * Si esta persona puede aparecer con nombre en el muro.
 *
 * Hacen falta las dos cosas, y el orden en que se leen importa: hay un nombre
 * **y** la persona no pidió anonimato. Que falte cualquiera de las dos deja la
 * donación como anónima, que es el resultado seguro. La regla equivalente vive
 * en la vista `donation_wall` (ADR-030): esto es para que la interfaz no le
 * ofrezca a nadie un "vas a aparecer como…" que la base va a contradecir.
 */
export function canAppearNamed(profile: DonorProfile): boolean {
  return !profile.defaultAnonymous && displayNameOf(profile) !== null;
}

/** Reservar un bien pide no estar rechazada. Confirmar el correo alcanza (ADR-046). */
export function canReserve(profile: DonorProfile): boolean {
  return profile.approvalStatus !== "declined";
}

export function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return (
    typeof value === "string" && (APPROVAL_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Los únicos tipos que el bucket de retratos acepta. Sin AVIF: este proyecto no
 * lee sus medidas, y un retrato sin ancho y alto no se puede reservar en el
 * layout (principio VII).
 */
export const PORTRAIT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type PortraitMimeType = (typeof PORTRAIT_MIME_TYPES)[number];

export const PORTRAIT_BUCKET = "avatares";

const PORTRAIT_EXTENSION: Record<PortraitMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** La ruta propia: `{userId}/retrato.{ext}`. No se conserva el nombre original. */
export function portraitPathFor(userId: string, mimeType: PortraitMimeType): string {
  return `${userId}/retrato.${PORTRAIT_EXTENSION[mimeType]}`;
}

export function isPortraitMimeType(value: unknown): value is PortraitMimeType {
  return (
    typeof value === "string" &&
    (PORTRAIT_MIME_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Si esa ruta es el retrato de esta persona, y no el de otra ni un path libre.
 *
 * Es la misma invariante que el `check` de la columna: una cuenta no puede
 * apuntar su perfil al archivo de otra.
 */
export function isOwnPortraitPath(userId: string, path: string | null): boolean {
  if (path === null) {
    return false;
  }

  return PORTRAIT_MIME_TYPES.some((mime) => portraitPathFor(userId, mime) === path);
}

/** Lo que el backoffice muestra de una cuenta del público. El correo viene de donor_contact(). */
export interface DonorAccountAdminRecord {
  readonly userId: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly locale: Locale;
  readonly defaultAnonymous: boolean;
  readonly approvalStatus: ApprovalStatus;
  readonly createdAt: string;
  readonly reviewedAt: string | null;
  readonly reviewNote: string | null;
}
