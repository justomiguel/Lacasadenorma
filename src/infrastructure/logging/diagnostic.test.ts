import { afterEach, describe, expect, it, vi } from "vitest";

import { formatErrorDiagnostic, toErrorDiagnostic } from "./error-diagnostic";
import {
  isErrorStackEnabled,
  readRememberedDiagnostic,
  rememberDiagnostic,
} from "./diagnostic";

describe("isErrorStackEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("está apagado si la variable no es 1", () => {
    vi.stubEnv("SHOW_ERROR_STACK", "");
    expect(isErrorStackEnabled()).toBe(false);
  });

  it("se prende con SHOW_ERROR_STACK=1", () => {
    vi.stubEnv("SHOW_ERROR_STACK", "1");
    expect(isErrorStackEnabled()).toBe(true);
  });
});

describe("toErrorDiagnostic", () => {
  it("conserva status, code y stack", () => {
    const error = new Error("JWT expired");
    (error as Error & { status?: number; code?: string }).status = 401;
    (error as Error & { status?: number; code?: string }).code = "PGRST301";

    const diagnostic = toErrorDiagnostic(error, "abc");

    expect(diagnostic.message).toBe("JWT expired");
    expect(diagnostic.status).toBe(401);
    expect(diagnostic.code).toBe("PGRST301");
    expect(diagnostic.digest).toBe("abc");
    expect(diagnostic.stack).toContain("JWT expired");
    expect(formatErrorDiagnostic(diagnostic)).toContain("401");
  });
});

describe("rememberDiagnostic", () => {
  it("devuelve el diagnóstico por digest", () => {
    rememberDiagnostic("d1", new Error("boom"));

    expect(readRememberedDiagnostic("d1")?.message).toBe("boom");
    expect(readRememberedDiagnostic("missing")).toBeNull();
  });
});
