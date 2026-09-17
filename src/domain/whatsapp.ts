/**
 * Enlace de WhatsApp para un número que alguien escribió a mano (ADR-051).
 *
 * `wa.me` pide dígitos con código de país, sin + ni ceros de trunk. En
 * Argentina el móvil lleva 54 9 delante del área.
 */
export function whatsappHrefFor(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 6) {
    return null;
  }

  return `https://wa.me/${toWhatsappDigits(digits)}`;
}

function toWhatsappDigits(digits: string): string {
  const stripped = digits.replace(/^0+/, "");

  if (stripped.startsWith("549")) {
    return stripped;
  }

  if (stripped.startsWith("54") && stripped.length >= 12) {
    return `549${stripped.slice(2)}`;
  }

  if (stripped.length === 10) {
    return `549${stripped}`;
  }

  return stripped;
}
