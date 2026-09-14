import { revalidatePath } from "next/cache";

/**
 * Palanca de las pruebas con-datos: invalidar ISR sin pasar por el backoffice.
 *
 * Las acciones del admin llaman `revalidatePath` (ADR-017). El cleanup de
 * Playwright a veces le habla a PostgREST directo —el browser ya se cerró— y
 * sin esto `/catalogo` sigue mostrando el ítem hasta que vencen los 300 s.
 * El harness de `scripts/local-api` no puede tocar la caché de Next: vive en
 * otro proceso.
 *
 * Fuera de `E2E_MODO=con-datos` no existe: GET y POST contestan 404. En
 * producción esa variable no está.
 */

export const dynamic = "force-dynamic";

const RUTA_PUBLICA = /^\/(?:en\/)?[a-z0-9][a-z0-9\-./]*$/u;

export function GET(): Response {
  return new Response(null, { status: 404 });
}

export async function POST(request: Request): Promise<Response> {
  if (process.env["E2E_MODO"] !== "con-datos") {
    return new Response(null, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "JSON inválido." }, { status: 400 });
  }

  const paths = pathsOf(body);

  if (paths === null) {
    return Response.json({ message: "Faltan paths públicos." }, { status: 400 });
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

function pathsOf(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null || !("paths" in body)) {
    return null;
  }

  const { paths } = body;

  if (!Array.isArray(paths) || paths.length === 0) {
    return null;
  }

  const valid: string[] = [];

  for (const path of paths) {
    if (typeof path !== "string" || !RUTA_PUBLICA.test(path)) {
      return null;
    }

    valid.push(path);
  }

  return valid;
}
