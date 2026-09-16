import { handleIdentityEmailHook } from "@/src/infrastructure/email/identity-hook";

/**
 * Auth llama acá en lugar de mandar el correo por SMTP (ADR-028).
 *
 * El cuerpo trae el token que esta aplicación no puede emitir. La firma
 * Standard Webhooks es lo que impide que un POST suelto dispare un correo.
 */
export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleIdentityEmailHook(request);
}
