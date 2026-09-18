import { redact } from "./logger";

export interface ErrorDiagnostic {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly digest?: string;
  readonly code?: unknown;
  readonly details?: unknown;
  readonly hint?: unknown;
  readonly status?: unknown;
  readonly cause?: unknown;
}

export function toErrorDiagnostic(error: unknown, digest?: string): ErrorDiagnostic {
  const redacted = redact(error);
  const digestField = digest === undefined || digest.length === 0 ? {} : { digest };

  if (typeof redacted === "object" && redacted !== null) {
    const record = redacted as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : "Error";
    const message = typeof record.message === "string" ? record.message : String(error);

    return {
      name,
      message,
      ...digestField,
      ...(typeof record.stack === "string" ? { stack: record.stack } : {}),
      ...(record.code === undefined ? {} : { code: record.code }),
      ...(record.details === undefined ? {} : { details: record.details }),
      ...(record.hint === undefined ? {} : { hint: record.hint }),
      ...(record.status === undefined ? {} : { status: record.status }),
      ...(record.cause === undefined ? {} : { cause: record.cause }),
    };
  }

  return { name: "Error", message: String(error), ...digestField };
}

export function formatErrorDiagnostic(diagnostic: ErrorDiagnostic): string {
  const lines = [`${diagnostic.name}: ${diagnostic.message}`];

  if (diagnostic.status !== undefined) {
    lines.push(`status: ${textOf(diagnostic.status)}`);
  }

  if (diagnostic.code !== undefined) {
    lines.push(`code: ${textOf(diagnostic.code)}`);
  }

  if (diagnostic.details !== undefined) {
    lines.push(`details: ${textOf(diagnostic.details)}`);
  }

  if (diagnostic.hint !== undefined) {
    lines.push(`hint: ${textOf(diagnostic.hint)}`);
  }

  if (diagnostic.digest !== undefined && diagnostic.digest.length > 0) {
    lines.push(`digest: ${diagnostic.digest}`);
  }

  if (diagnostic.stack !== undefined && diagnostic.stack.length > 0) {
    lines.push(diagnostic.stack);
  }

  if (diagnostic.cause !== undefined) {
    lines.push(`cause: ${textOf(diagnostic.cause)}`);
  }

  return lines.join("\n");
}

function textOf(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
