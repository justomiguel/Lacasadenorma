/**
 * Límite de tasa por IP, en memoria del proceso.
 *
 * **Lo que esto es y lo que no.** No es una defensa contra un ataque distribuido:
 * en Vercel cada instancia serverless tiene su propio mapa, así que el límite real
 * es el declarado multiplicado por la cantidad de instancias vivas. Sirve para lo
 * que la spec pide (amenaza A2, "abuso de la API por un agente en bucle"): que un
 * cliente equivocado o insistente no convierta la base en su fuente de polling.
 *
 * Se elige esto antes que un contador en Redis porque el proyecto no tiene Redis y
 * agregarlo por este endpoint sería sobrearquitectura (principio III). Cuando el
 * tráfico lo justifique, se reemplaza la implementación de este archivo sin tocar
 * las rutas: el límite del borde de Vercel es la evolución natural y está anotada
 * en `docs/security.md`.
 *
 * La ventana es fija y no deslizante. Una ventana deslizante necesitaría guardar
 * la marca de cada pedido; con ventana fija basta un contador y un vencimiento, y
 * el peor caso —el doble del límite en el cruce de dos ventanas— es irrelevante
 * para lo que este límite protege.
 */

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  /** Segundos hasta que se reinicie la ventana. Va en `Retry-After`. */
  readonly retryAfterSeconds: number;
}

export interface RateLimitOptions {
  readonly limit: number;
  readonly windowMs: number;
}

const DEFAULT_OPTIONS: RateLimitOptions = { limit: 60, windowMs: 60_000 };

interface Window {
  count: number;
  expiresAt: number;
}

/**
 * El mapa vive en el módulo, no en un `globalThis`: si el módulo se recarga, el
 * contador se reinicia, y reiniciar un contador de abuso es un fallo benigno.
 */
const windows = new Map<string, Window>();

/** Cota del mapa. Sin esto, una ráfaga de IPs distintas sería una fuga de memoria. */
const MAX_TRACKED_KEYS = 10_000;

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = DEFAULT_OPTIONS,
  now: number = Date.now(),
): RateLimitDecision {
  const existing = windows.get(key);

  if (existing === undefined || existing.expiresAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) {
      pruneExpired(now);
    }

    windows.set(key, { count: 1, expiresAt: now + options.windowMs });

    return {
      allowed: true,
      limit: options.limit,
      remaining: options.limit - 1,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  existing.count += 1;

  const retryAfterSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));

  return {
    allowed: existing.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSeconds,
  };
}

function pruneExpired(now: number): void {
  for (const [key, window] of windows) {
    if (window.expiresAt <= now) {
      windows.delete(key);
    }
  }

  // Si después de limpiar sigue lleno, el mapa se vacía entero. Perder los
  // contadores es preferible a crecer sin techo, y es un caso que sólo ocurre bajo
  // un ataque que este límite no pretende detener de todos modos.
  if (windows.size >= MAX_TRACKED_KEYS) {
    windows.clear();
  }
}

/**
 * Identifica a quien llama.
 *
 * `x-forwarded-for` es falsificable en general, pero en Vercel el borde lo
 * reescribe y el primer valor es la IP real del cliente. Sin cabecera —desarrollo
 * local— todos comparten la misma clave, y eso está bien: en local el límite no
 * protege nada.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded !== null && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "desconocido";
  }

  return headers.get("x-real-ip") ?? "desconocido";
}

/** Sólo para los tests: vacía el estado entre casos. */
export function resetRateLimits(): void {
  windows.clear();
}
