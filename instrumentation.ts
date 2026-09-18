import type { Instrumentation } from "next";

import {
  rememberDiagnostic,
  toErrorDiagnostic,
} from "@/src/infrastructure/logging/diagnostic";
import { logger } from "@/src/infrastructure/logging/logger";

/**
 * Todo error de request queda en el log con stack (ADR-053). El digest es la
 * llave para `/api/diagnostico` cuando el toggle está prendido.
 */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const rawDigest =
    typeof err === "object" && err !== null && "digest" in err
      ? (err as { digest?: unknown }).digest
      : undefined;
  const digest = typeof rawDigest === "string" ? rawDigest : "";
  const diagnostic = toErrorDiagnostic(err, digest.length > 0 ? digest : undefined);

  if (digest.length > 0) {
    rememberDiagnostic(digest, err);
  }

  logger.error("error de request", {
    error: err,
    path: request.path,
    method: request.method,
    route: context.routePath,
    digest: diagnostic.digest,
  });
};
