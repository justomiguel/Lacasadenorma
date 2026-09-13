/**
 * Credenciales del correo del producto, leídas en un solo lugar.
 *
 * La clave y el remitente mandan. La dirección del equipo es otra cosa: sin ella
 * el aviso al staff no sale y el correo a la persona **sí** (FR-236, ADR-032).
 * Ninguna lleva `NEXT_PUBLIC_`.
 */

export interface EmailConfig {
  readonly apiKey: string;
  readonly from: string;
}

export function readEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM_ADDRESS?.trim();

  if (
    apiKey === undefined ||
    apiKey.length === 0 ||
    from === undefined ||
    from.length === 0
  ) {
    return null;
  }

  return { apiKey, from };
}

export function readStaffAddress(): string | null {
  const address = process.env.EMAIL_STAFF_ADDRESS?.trim();

  return address === undefined || address.length === 0 ? null : address;
}
