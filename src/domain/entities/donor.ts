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
export interface DonorProfile {
  readonly userId: string;
  readonly displayName: string | null;
  readonly locale: Locale;
  readonly defaultAnonymous: boolean;
}

/**
 * El anonimato es el valor por defecto, y está acá como constante para que el
 * default viva en un solo lugar.
 *
 * La columna `default_anonymous` de la base arranca en `true` por la misma
 * razón: si el default fuera "aparecer", una persona que se registra y reserva
 * sin leer ninguna casilla terminaría con su nombre publicado por omisión, y
 * ese consentimiento no es consentimiento (FR-239). Al revés, el costo de
 * equivocarse es que alguien que quería aparecer no aparece hasta que lo pide.
 */
export const ANONYMOUS_BY_DEFAULT = true;

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
