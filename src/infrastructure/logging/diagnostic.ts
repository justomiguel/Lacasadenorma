import { toErrorDiagnostic, type ErrorDiagnostic } from "./error-diagnostic";

export const ERROR_STACK_COOKIE = "error_diagnostic";

export { toErrorDiagnostic, type ErrorDiagnostic } from "./error-diagnostic";

const recent = new Map<string, ErrorDiagnostic>();
const RECENT_CAP = 32;

export function isErrorStackEnabled(): boolean {
  return process.env.SHOW_ERROR_STACK === "1";
}

export function rememberDiagnostic(digest: string, error: unknown): ErrorDiagnostic {
  const diagnostic = toErrorDiagnostic(error, digest);

  recent.set(digest, diagnostic);

  if (recent.size > RECENT_CAP) {
    const oldest = recent.keys().next().value;

    if (oldest !== undefined) {
      recent.delete(oldest);
    }
  }

  return diagnostic;
}

export function readRememberedDiagnostic(digest: string): ErrorDiagnostic | null {
  return recent.get(digest) ?? null;
}

export async function publishErrorDiagnostic(error: unknown): Promise<void> {
  if (!isErrorStackEnabled()) {
    return;
  }

  const diagnostic = toErrorDiagnostic(error);
  const encoded = encodeURIComponent(JSON.stringify(diagnostic));

  if (encoded.length > 3500) {
    return;
  }

  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();

    store.set(ERROR_STACK_COOKIE, encoded, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 120,
    });
  } catch {
    // Fuera de un request (tests, script). El log ya tiene el stack.
  }
}

export async function consumeErrorDiagnostic(): Promise<ErrorDiagnostic | null> {
  if (!isErrorStackEnabled()) {
    return null;
  }

  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const raw = store.get(ERROR_STACK_COOKIE)?.value;

    if (raw === undefined || raw.length === 0) {
      return null;
    }

    store.delete(ERROR_STACK_COOKIE);

    const parsed: unknown = JSON.parse(decodeURIComponent(raw));

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : "Error";
    const message = typeof record.message === "string" ? record.message : "";

    return {
      name,
      message,
      ...(typeof record.stack === "string" ? { stack: record.stack } : {}),
      ...(typeof record.digest === "string" ? { digest: record.digest } : {}),
      ...(record.code === undefined ? {} : { code: record.code }),
      ...(record.details === undefined ? {} : { details: record.details }),
      ...(record.hint === undefined ? {} : { hint: record.hint }),
      ...(record.status === undefined ? {} : { status: record.status }),
      ...(record.cause === undefined ? {} : { cause: record.cause }),
    };
  } catch {
    return null;
  }
}
