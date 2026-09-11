import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REDACTED, createLogger, redact } from "./logger";

describe("redact", () => {
  it("oculta el valor de las claves sensibles", () => {
    expect(
      redact({ token: "abc123", authorization: "Bearer x", cookie: "sb-access-token=y" }),
    ).toEqual({ token: REDACTED, authorization: REDACTED, cookie: REDACTED });
  });

  it("compara los nombres de clave sin distinguir mayúsculas ni guiones", () => {
    expect(redact({ "Set-Cookie": "a", ACCESS_TOKEN: "b", apiKey: "c" })).toEqual({
      "Set-Cookie": REDACTED,
      ACCESS_TOKEN: REDACTED,
      apiKey: REDACTED,
    });
  });

  it("oculta datos personales", () => {
    expect(
      redact({
        email: "norma@example.com",
        password: "x",
        cbu: "1",
        contributorName: "y",
      }),
    ).toEqual({
      email: REDACTED,
      password: REDACTED,
      cbu: REDACTED,
      contributorName: REDACTED,
    });
  });

  it("recorre objetos anidados y arrays", () => {
    expect(
      redact({ user: { id: "u1", email: "a@b.com" }, list: [{ token: "t" }] }),
    ).toEqual({
      user: { id: "u1", email: REDACTED },
      list: [{ token: REDACTED }],
    });
  });

  it("deja pasar los datos que no son sensibles", () => {
    expect(redact({ campaignId: "c1", count: 3, ok: true, nothing: null })).toEqual({
      campaignId: "c1",
      count: 3,
      ok: true,
      nothing: null,
    });
  });

  it("no explota con referencias circulares", () => {
    const circular: Record<string, unknown> = { name: "raiz" };
    circular.self = circular;

    expect(() => redact(circular)).not.toThrow();
  });
});

describe("createLogger", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    consoleError.mockClear();
    consoleWarn.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("emite una línea JSON con nivel, mensaje y momento", () => {
    createLogger({ service: "test" }).error("falló la conciliación");

    expect(consoleError).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleError.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;

    expect(payload.level).toBe("error");
    expect(payload.message).toBe("falló la conciliación");
    expect(payload.service).toBe("test");
    expect(typeof payload.time).toBe("string");
  });

  it("redacta el contexto antes de emitirlo", () => {
    createLogger().error("fallo al leer gastos", { token: "secreto", campaignId: "c1" });

    const payload = JSON.parse(String(consoleError.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;

    expect(JSON.stringify(payload)).not.toContain("secreto");
    expect(payload.token).toBe(REDACTED);
    expect(payload.campaignId).toBe("c1");
  });

  it("serializa un Error con su nombre, mensaje y causa", () => {
    const cause = new Error("connection refused");

    createLogger().error("no se pudo conectar", { error: new Error("fallo", { cause }) });

    const payload = JSON.parse(String(consoleError.mock.calls[0]?.[0])) as {
      error: { name: string; message: string; cause: { name: string; message: string } };
    };

    expect(payload.error.name).toBe("Error");
    expect(payload.error.message).toBe("fallo");
    // La causa conserva su mensaje: es el dato con el que se diagnostica. Un
    // `String(cause)` lo habría dejado en `[object Object]` (principio X).
    expect(payload.error.cause.message).toBe("connection refused");
  });

  it("una causa con una clave sensible también se redacta", () => {
    const cause = new Error("rechazado");
    (cause as Error & { detail?: unknown }).detail = { token: "abc" };

    createLogger().error("no se pudo conectar", {
      error: new Error("fallo", { cause: { token: "abc", status: 401 } }),
    });

    const payload = JSON.parse(String(consoleError.mock.calls[0]?.[0])) as {
      error: { cause: { token: string; status: number } };
    };

    expect(payload.error.cause.token).toBe(REDACTED);
    expect(payload.error.cause.status).toBe(401);
  });

  it("no emite `debug` fuera de desarrollo, para no llenar los logs de producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    createLogger().debug("detalle");

    expect(consoleLog).not.toHaveBeenCalled();
    consoleLog.mockRestore();
  });
});
