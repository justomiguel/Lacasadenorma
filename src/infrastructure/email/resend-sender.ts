import type {
  EmailKind,
  EmailMessage,
  EmailResult,
  EmailSender,
} from "@/src/domain/ports/email";

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

export interface ResendSenderOptions {
  readonly apiKey: string;
  readonly from: string;
  readonly fetchImpl?: typeof fetch;
}

/**
 * El adaptador de Resend. Un `POST` con seis campos. Sin el paquete `resend`
 * (ADR-028): el SDK envuelve esto y agrega un helper de React que este proyecto
 * no usa.
 *
 * Nunca lanza por un fallo del proveedor. `failed` es un resultado, no una
 * excepción: quien llama ya confirmó la operación y no puede deshacerla porque
 * un correo no salió (FR-233).
 */
export class ResendSender implements EmailSender {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ResendSenderOptions) {
    this.apiKey = options.apiKey;
    this.from = options.from;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(_kind: EmailKind, message: EmailMessage): Promise<EmailResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await this.fetchImpl(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await readError(response);

        return { status: "failed", error: `${response.status}: ${detail}` };
      }

      const payload = (await response.json()) as { id?: unknown };
      const providerId = typeof payload.id === "string" ? payload.id : "resend";

      return { status: "sent", providerId };
    } catch (error) {
      const cause = error instanceof Error ? error.message : "error de red";

      return { status: "failed", error: cause.slice(0, 200) };
    } finally {
      clearTimeout(timer);
    }
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown };
    const message = payload.message;

    return typeof message === "string" && message.length > 0
      ? message.slice(0, 200)
      : response.statusText;
  } catch {
    return response.statusText;
  }
}
