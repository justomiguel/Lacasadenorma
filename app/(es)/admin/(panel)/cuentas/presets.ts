import type { CountryCode } from "@/src/domain/entities";
import type { CurrencyCode } from "@/src/domain/money";

/**
 * Qué datos hace falta cargar en cada país.
 *
 * El modelo guarda los datos de una cuenta como una lista abierta (ADR-006), porque
 * los quince campos posibles de tres países no caben en columnas fijas. Pero un
 * formulario abierto —"etiqueta" y "valor", cinco veces— traslada a quien carga la
 * cuenta un trabajo que el sistema puede hacer: saber que una cuenta argentina se
 * publica con alias, CBU, titular y CUIT.
 *
 * Así que la apertura queda en el modelo y la guía queda acá. Es la diferencia entre
 * escribir "CBU" en un campo llamado "etiqueta 2" y escribir el CBU en el campo que
 * dice CBU, y en la operación de mayor consecuencia del sistema esa diferencia
 * importa: el error que este proyecto no puede cometer es publicar un dato bancario
 * en el renglón equivocado.
 *
 * `copyable` no se pregunta: es una propiedad del dato, no una preferencia. Un CBU se
 * pega en el formulario del banco; el nombre del titular se lee y se compara.
 */

export interface AccountFieldPreset {
  readonly label: string;
  readonly hint: string | null;
  readonly copyable: boolean;
  /** Para el `inputMode` del campo: un CBU son 22 dígitos y conviene el teclado numérico. */
  readonly numeric?: boolean;
}

export interface CountryPreset {
  readonly countryCode: CountryCode;
  readonly currency: CurrencyCode;
  /** Cómo se llama la cuenta en la lista pública, por defecto. */
  readonly label: string;
  readonly fields: readonly AccountFieldPreset[];
  readonly instructions: string;
}

export const COUNTRY_PRESETS: readonly CountryPreset[] = [
  {
    countryCode: "AR",
    currency: "ARS",
    label: "Transferencia en pesos",
    fields: [
      {
        label: "Alias",
        hint: "Es lo más corto de copiar desde el homebanking.",
        copyable: true,
      },
      {
        label: "CBU",
        hint: "Veintidós dígitos, sin espacios.",
        copyable: true,
        numeric: true,
      },
      { label: "Titular", hint: "Como figura en la cuenta.", copyable: false },
      { label: "CUIT o CUIL", hint: null, copyable: true, numeric: true },
      { label: "Banco", hint: null, copyable: false },
    ],
    instructions:
      "Desde tu homebanking, transferencia por CBU o alias. No hace falta avisar: la conciliación se hace contra el resumen del banco.",
  },
  {
    countryCode: "CL",
    currency: "CLP",
    label: "Transferencia en pesos chilenos",
    fields: [
      { label: "Banco", hint: null, copyable: false },
      { label: "Tipo de cuenta", hint: "Corriente, vista o RUT.", copyable: false },
      { label: "Número de cuenta", hint: null, copyable: true, numeric: true },
      { label: "RUT", hint: "Con guion y dígito verificador.", copyable: true },
      { label: "Titular", hint: null, copyable: false },
      {
        label: "Correo para el comprobante",
        hint: "Algunos bancos chilenos lo piden para transferir.",
        copyable: true,
      },
    ],
    instructions:
      "Transferencia entre bancos chilenos. Si tu banco pide un correo para enviar el comprobante, usá el que figura acá.",
  },
  {
    countryCode: "US",
    currency: "USD",
    label: "Transferencia en dólares",
    fields: [
      { label: "Beneficiary name", hint: "El titular de la cuenta.", copyable: false },
      { label: "Bank name", hint: null, copyable: false },
      {
        label: "Routing number (ABA)",
        hint: "Nueve dígitos.",
        copyable: true,
        numeric: true,
      },
      { label: "Account number", hint: null, copyable: true, numeric: true },
      { label: "Account type", hint: "Checking o savings.", copyable: false },
      {
        label: "SWIFT / BIC",
        hint: "Sólo para transferencias internacionales.",
        copyable: true,
      },
    ],
    instructions:
      "Los bancos de Estados Unidos cobran un cargo por transferencia internacional que el proyecto no controla. El monto que llega es el que se registra.",
  },
];
