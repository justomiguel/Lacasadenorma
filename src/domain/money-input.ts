import { DomainError } from "./errors";
import { money, type CurrencyCode, type Money } from "./money";

/**
 * Un monto escrito a mano, convertido a la unidad mínima.
 *
 * Existe porque el formulario del backoffice se completa desde un teléfono, con el
 * comprobante del corralón en la otra mano, y nadie escribe centavos ahí. Lo que se
 * escribe es "1.240.000" o "1240000,50" o "$ 1 240 000", y las tres cosas son el
 * mismo número. Adivinar mal el separador decimal es la peor falla posible de este
 * archivo: convierte un gasto de mil doscientos cuarenta mil pesos en uno de mil
 * doscientos cuarenta, y la página de transparencia lo publica.
 *
 * Las reglas, en orden:
 *
 * 1. Se ignoran el símbolo de moneda, los espacios —incluido el fino— y nada más.
 *    Cualquier otro carácter hace fallar la conversión en lugar de descartarse.
 * 2. La coma es **siempre** el separador decimal, y el punto **siempre** el de
 *    miles. Es la convención de es-AR y el formulario lo dice al lado del campo. No
 *    se intenta inferir por posición: "1.500" es mil quinientos en Argentina y uno
 *    y medio en Estados Unidos, y una heurística que acierta el 95% de las veces
 *    con dinero de otras personas no es aceptable.
 * 3. La cantidad de decimales tiene que caber en la unidad mínima de la moneda. En
 *    pesos y dólares son dos; en pesos chilenos, ninguno, así que "1200,5 CLP" es
 *    un error y no un redondeo silencioso (principio XII).
 * 4. El resultado se construye con `money()`, que rechaza lo que no sea entero
 *    seguro. Un monto absurdo falla acá y no en la base.
 */

const MINOR_UNIT_DIGITS: Record<CurrencyCode, number> = {
  ARS: 2,
  USD: 2,
  CLP: 0,
};

/** Espacio común, espacio fino, espacio irrompible y el símbolo de peso o dólar. */
const IGNORABLE = /[\s\u00a0\u202f$]/g;

export class AmountFormatError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "AmountFormatError";
  }
}

export function parseAmount<C extends CurrencyCode>(
  input: string,
  currency: C,
): Money<C> {
  const cleaned = input.replace(IGNORABLE, "");

  if (cleaned.length === 0) {
    throw new AmountFormatError("Escribí un monto.");
  }

  if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(cleaned)) {
    throw new AmountFormatError(
      "El monto se escribe con punto para los miles y coma para los centavos: 1.240.000,50.",
    );
  }

  const [whole = "", fraction = ""] = cleaned.split(",");
  const digits = MINOR_UNIT_DIGITS[currency];

  if (fraction.length > digits) {
    throw new AmountFormatError(
      digits === 0
        ? `El ${currency} no tiene centavos: escribí un monto sin coma.`
        : `El monto en ${currency} admite hasta ${String(digits)} decimales.`,
    );
  }

  const minor = `${whole.replace(/\./g, "")}${fraction.padEnd(digits, "0")}`;

  return money(Number(minor), currency);
}

/**
 * El valor que va en un `<input>` para editar un monto ya guardado. Es la inversa
 * de `parseAmount`, sin separador de miles: el separador molesta al editar y no
 * aporta nada en un campo de una línea.
 */
export function amountToInputValue(amount: Money): string {
  const digits = MINOR_UNIT_DIGITS[amount.currency];

  if (digits === 0) {
    return String(amount.amountMinor);
  }

  const divisor = 10 ** digits;
  const whole = Math.trunc(Math.abs(amount.amountMinor) / divisor);
  const fraction = Math.abs(amount.amountMinor) % divisor;
  const sign = amount.amountMinor < 0 ? "-" : "";

  return fraction === 0
    ? `${sign}${String(whole)}`
    : `${sign}${String(whole)},${String(fraction).padStart(digits, "0")}`;
}
