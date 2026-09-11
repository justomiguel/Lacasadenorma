import { beforeEach, describe, expect, it } from "vitest";

import { checkRateLimit, clientKey, resetRateLimits } from "./rate-limit";

const OPTIONS = { limit: 3, windowMs: 1000 };

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("permite hasta el límite y rechaza el siguiente", () => {
    const decisions = [0, 1, 2, 3].map(() => checkRateLimit("1.2.3.4", OPTIONS, 0));

    expect(decisions.map((decision) => decision.allowed)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(decisions.at(-1)?.remaining).toBe(0);
  });

  it("reinicia el contador cuando vence la ventana", () => {
    checkRateLimit("1.2.3.4", OPTIONS, 0);
    checkRateLimit("1.2.3.4", OPTIONS, 0);
    checkRateLimit("1.2.3.4", OPTIONS, 0);

    expect(checkRateLimit("1.2.3.4", OPTIONS, 999).allowed).toBe(false);
    expect(checkRateLimit("1.2.3.4", OPTIONS, 1000).allowed).toBe(true);
  });

  it("cuenta cada IP por separado", () => {
    checkRateLimit("1.2.3.4", OPTIONS, 0);
    checkRateLimit("1.2.3.4", OPTIONS, 0);
    checkRateLimit("1.2.3.4", OPTIONS, 0);

    expect(checkRateLimit("5.6.7.8", OPTIONS, 0).allowed).toBe(true);
  });

  it("informa cuántos segundos falta esperar", () => {
    checkRateLimit("1.2.3.4", OPTIONS, 0);

    // Nunca cero: un `Retry-After: 0` invita a reintentar de inmediato, que es lo
    // contrario de lo que el límite quiere conseguir.
    expect(checkRateLimit("1.2.3.4", OPTIONS, 1).retryAfterSeconds).toBe(1);
  });
});

describe("clientKey", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });

    expect(clientKey(headers)).toBe("203.0.113.9");
  });

  it("cae a x-real-ip y después a un valor fijo", () => {
    expect(clientKey(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientKey(new Headers())).toBe("desconocido");
  });
});
