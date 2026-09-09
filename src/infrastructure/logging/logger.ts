import type { LogContext, LogLevel, Logger } from "@/src/domain/ports/logger";

/**
 * Logger estructurado con redacción obligatoria (amenaza I5).
 *
 * La redacción es parte del logger, no una responsabilidad de quien llama: si
 * fuera opcional, alguna vez se iba a olvidar. Emite una línea JSON por evento,
 * que es lo que los recolectores de Vercel y de cualquier otro proveedor
 * consumen sin configuración.
 */

export const REDACTED = "[redactado]";

/**
 * Claves cuyo valor nunca se emite. La comparación normaliza mayúsculas,
 * guiones y guiones bajos, así que `Set-Cookie`, `set_cookie` y `setCookie`
 * caen todas en la misma entrada.
 */
const SENSITIVE_KEYS = new Set([
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "authorization",
  "cookie",
  "setcookie",
  "password",
  "secret",
  "apikey",
  "key",
  "clave",
  "email",
  "phone",
  "telefono",
  "dni",
  "cbu",
  "cvu",
  "alias",
  "iban",
  "accountnumber",
  "routingnumber",
  "rut",
  "contributorname",
  "contributordisplayname",
  "sourcenote",
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_\s]/g, "");
}

/**
 * La causa se pasa por `redact` y no por `String()`: una causa suele ser otro
 * `Error`, y convertirla a texto perdería su mensaje detrás de un
 * `[object Object]`. De paso, si la causa es un objeto con una clave sensible,
 * también se redacta.
 */
function serializeError(error: Error, seen: WeakSet<object>): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    ...(error.cause === undefined ? {} : { cause: redact(error.cause, seen) }),
  };
}

export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    if (seen.has(value)) {
      return "[circular]";
    }
    seen.add(value);

    return serializeError(value, seen);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[circular]";
  }
  seen.add(value);

  const result: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value)) {
    result[key] = SENSITIVE_KEYS.has(normalizeKey(key))
      ? REDACTED
      : redact(nested, seen);
  }

  return result;
}

export interface LoggerOptions {
  readonly service?: string;
}

function emit(level: LogLevel, message: string, options: LoggerOptions, context?: LogContext) {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...(options.service === undefined ? {} : { service: options.service }),
    ...(context === undefined ? {} : (redact(context) as Record<string, unknown>)),
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  // `info` y `debug` sólo en desarrollo: en producción el ruido tapa las señales,
  // y la constitución prohíbe `console.log` en producción.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console -- única salida de nivel informativo, restringida a desarrollo
    console.log(line);
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return {
    debug: (message, context) => emit("debug", message, options, context),
    info: (message, context) => emit("info", message, options, context),
    warn: (message, context) => emit("warn", message, options, context),
    error: (message, context) => emit("error", message, options, context),
  };
}

/** Instancia compartida del servidor. */
export const logger = createLogger({ service: "casa-de-norma" });
