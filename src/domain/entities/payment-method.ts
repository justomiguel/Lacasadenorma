import type { CurrencyCode } from "../money";

export const COUNTRY_CODES = ["AR", "CL", "US"] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  AR: "Argentina",
  CL: "Chile",
  US: "Estados Unidos",
};

/**
 * `bank_transfer` es lo único que existe hoy. Los otros valores están
 * reservados para que agregar un medio de pago no requiera migrar el modelo
 * (FR-008); ninguno se implementa en esta versión.
 */
export const PAYMENT_METHOD_KINDS = [
  "bank_transfer",
  "mercado_pago",
  "stripe",
  "paypal",
] as const;

export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export interface PaymentMethodField {
  readonly label: string;
  readonly value: string;
  /** Los datos que se pegan en un formulario del banco se copian; un nombre no. */
  readonly copyable: boolean;
  readonly hint: string | null;
}

export interface PaymentMethod {
  readonly id: string;
  readonly kind: PaymentMethodKind;
  readonly countryCode: CountryCode;
  readonly currency: CurrencyCode;
  readonly label: string;
  readonly fields: readonly PaymentMethodField[];
  readonly instructions: string | null;
  readonly sortOrder: number;
}

/**
 * Una cuenta vista desde el backoffice.
 *
 * `publishedAt` es acá el dato más importante de la pantalla: una cuenta guardada y
 * sin publicar no recibe nada, y una publicada recibe todo. Que el estado se vea en
 * la lista es lo que evita las dos equivocaciones posibles.
 */
export interface PaymentMethodAdminRecord extends PaymentMethod {
  readonly publishedAt: string | null;
}
