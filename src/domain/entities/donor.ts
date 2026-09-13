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
 * `displayName` es nulo hasta que la persona escribe uno. **No se deriva del
 * correo.** Convertir `norma.perez@ejemplo.com` en "Norma Pérez" es exactamente
 * el tipo de conveniencia que publica un apellido que nadie pidió publicar.
 */
export const APPROVAL_STATUSES = ["pending", "approved", "declined"] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface DonorProfile {
  readonly userId: string;
  readonly displayName: string | null;
  readonly locale: Locale;
  readonly defaultAnonymous: boolean;
  readonly approvalStatus: ApprovalStatus;
}

export const ANONYMOUS_BY_DEFAULT = true;

/** Confirmar el correo no habilita la reserva. Habilitarla es una decisión del equipo (ADR-033). */
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

/** Reservar material pide una cuenta habilitada, no sólo una sesión. */
export function canReserve(profile: DonorProfile): boolean {
  return profile.approvalStatus === "approved";
}

export function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return (
    typeof value === "string" && (APPROVAL_STATUSES as readonly string[]).includes(value)
  );
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
