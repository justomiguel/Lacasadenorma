import { z } from "zod";

import { CURRENCIES, type CurrencyCode, type Money } from "@/src/domain/money";
import { AmountFormatError, parseAmount } from "@/src/domain/money-input";

/**
 * Los campos que aparecen en más de un formulario del backoffice.
 *
 * Todos parten de `string | undefined`, porque lo que llega es un `FormData`: en
 * HTTP no existen los números, las fechas ni los booleanos, existen cadenas y
 * ausencias. Convertir acá, con el mensaje de error de cada campo, es lo que hace
 * que un monto mal escrito muestre "el monto se escribe así" debajo del campo del
 * monto y no un error genérico arriba de todo (FR-023).
 *
 * Los mensajes están escritos para quien completa el formulario desde el teléfono,
 * no para quien programó el esquema.
 */

export const requiredText = (label: string, max = 200) =>
  z
    .string({ error: `Falta ${label}.` })
    .trim()
    .min(1, `Falta ${label}.`)
    .max(max, `${label} no puede pasar de ${String(max)} caracteres.`);

/**
 * Un texto opcional donde el vacío significa "sin dato", no "cadena vacía". La
 * diferencia importa: la base guarda `null`, y una cadena vacía en una columna
 * nullable es un dato que después hay que interpretar.
 */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `No puede pasar de ${String(max)} caracteres.`)
    .optional()
    .transform((value) => (value === undefined || value.length === 0 ? null : value));

export const currency = z.enum(CURRENCIES, { error: "Elegí una moneda." });

/** Una fecha del calendario, sin hora. Nunca futura: no se registra lo que no pasó. */
export const pastDate = z
  .string({ error: "Falta la fecha." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha tiene que ser un día del calendario.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Esa fecha no existe.")
  .refine(
    (value) => Date.parse(value) <= Date.now() + 24 * 60 * 60 * 1000,
    "La fecha no puede ser futura.",
  );

/** Una fecha que puede no haber ocurrido todavía, como la de un hito pendiente. */
export const optionalPastDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value.length === 0 ? null : value))
  .refine(
    (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "La fecha tiene que ser un día del calendario.",
  )
  .refine(
    (value) => value === null || Date.parse(value) <= Date.now() + 24 * 60 * 60 * 1000,
    "La fecha no puede ser futura.",
  );

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export const uuid = (label: string) =>
  z.string({ error: `Falta ${label}.` }).regex(UUID_PATTERN, `${label} no es válido.`);

/** Una referencia opcional: el rubro de un gasto, por ejemplo, o el id al editar. */
export const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value.length === 0 ? null : value))
  .refine(
    (value) => value === null || UUID_PATTERN.test(value),
    "Esa referencia no es válida.",
  );

export const sortOrder = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value.length === 0 ? "0" : value))
  .refine((value) => /^\d{1,3}$/.test(value), "El orden es un número de 0 a 999.")
  .transform((value) => Number(value));

/**
 * Una casilla marcada llega como `"on"`; una sin marcar no llega. Es la única
 * codificación que existe en HTML, y por eso la ausencia es `false` y no un error.
 */
export const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

/** El motivo de una anulación. La base también lo exige (FR-015). */
export const voidReason = z
  .string({ error: "Escribí por qué se anula." })
  .trim()
  .min(10, "El motivo tiene que explicar qué pasó: al menos diez caracteres.")
  .max(300, "El motivo no puede pasar de 300 caracteres.");

/**
 * Un slug de URL. Se pide en lugar de derivarlo del título porque la dirección de
 * una novedad se comparte por WhatsApp y después no puede cambiar: quien la escribe
 * tiene que verla antes de publicar.
 */
export const slug = z
  .string({ error: "Falta la dirección web." })
  .trim()
  .toLowerCase()
  .min(3, "La dirección web necesita al menos tres caracteres.")
  .max(80, "La dirección web no puede pasar de 80 caracteres.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Sólo minúsculas, números y guiones: techo-nuevo, no “Techo nuevo”.",
  );

/**
 * Un monto y su moneda, convertidos juntos.
 *
 * Van juntos porque sin la moneda no se sabe cuántos decimales admite el número:
 * "1200,5" es válido en pesos y un error en pesos chilenos, donde no hay centavos.
 *
 * Devuelve `null` y deja el error en el campo `amount` cuando no se puede
 * interpretar, así el mensaje aparece debajo del campo del monto. Quien llama
 * devuelve `z.NEVER` para que Zod aborte la transformación.
 */
export function toMoney(
  ctx: z.RefinementCtx,
  amount: string,
  currencyCode: CurrencyCode,
  path = "amount",
): Money | null {
  try {
    return parseAmount(amount, currencyCode);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message:
        error instanceof AmountFormatError
          ? error.message
          : "Ese monto no se puede interpretar.",
    });

    return null;
  }
}
