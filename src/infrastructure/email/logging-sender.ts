import type {
  EmailKind,
  EmailMessage,
  EmailResult,
  EmailSender,
} from "@/src/domain/ports/email";

/**
 * Sin credencial, el correo no sale y la operación que lo disparó **sí**.
 *
 * `skipped` y no `failed`: no hay un proveedor caído, hay un despliegue que
 * eligió no configurar el correo (FR-233, FR-236). Quien llama muestra los datos
 * de la operación en lugar de prometer un correo que no va a llegar.
 *
 * El `to` no se registra. El logger redacta la clave `email`, pero un mensaje
 * que incruste la dirección en la prosa la pasaría igual, y no hay razón para
 * tenerla en un log de "no se mandó nada".
 */
export class LoggingSender implements EmailSender {
  private readonly warn: (message: string, context?: Record<string, unknown>) => void;

  constructor(options: {
    readonly warn: (message: string, context?: Record<string, unknown>) => void;
  }) {
    this.warn = options.warn;
  }

  send(kind: EmailKind, message: EmailMessage): Promise<EmailResult> {
    this.warn("Correo omitido: no hay credencial de Resend configurada", {
      kind,
      subject: message.subject,
      idempotencyKey: message.idempotencyKey,
    });

    return Promise.resolve({ status: "skipped", reason: "not-configured" });
  }
}
