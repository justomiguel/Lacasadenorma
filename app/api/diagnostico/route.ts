import {
  isErrorStackEnabled,
  readRememberedDiagnostic,
} from "@/src/infrastructure/logging/diagnostic";

export const dynamic = "force-dynamic";

/**
 * Devuelve el diagnóstico de un error de request si `SHOW_ERROR_STACK=1`.
 * Sin el toggle, 404: el stack no viaja al navegador (ADR-053, amenaza I6).
 */
export async function GET(request: Request): Promise<Response> {
  if (!isErrorStackEnabled()) {
    return Response.json({ error: "off" }, { status: 404 });
  }

  const digest = new URL(request.url).searchParams.get("digest")?.trim();

  if (digest === undefined || digest === null || digest.length === 0) {
    return Response.json({ error: "missing" }, { status: 400 });
  }

  const diagnostic = readRememberedDiagnostic(digest);

  if (diagnostic === null) {
    return Response.json({ error: "gone" }, { status: 404 });
  }

  return Response.json(diagnostic, { headers: { "Cache-Control": "no-store" } });
}
