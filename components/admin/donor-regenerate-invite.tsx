"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import {
  HiddenValue,
  IDLE_STATE,
  SubmitButton,
  type ActionState,
} from "@/components/admin/form";
import { focusFirstInvalidField } from "@/components/admin/form-action";

import { DonorInviteShare } from "./donor-invite-share";

/**
 * Otro enlace de invitación. El anterior sigue válido hasta que venza;
 * el nuevo no lo apaga. El URL vive en `value`, no en el mensaje.
 */
export function DonorRegenerateInvite({
  action,
  userId,
  email,
  phone,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  userId: string;
  email: string;
  phone: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, IDLE_STATE);

  useEffect(() => {
    if (state.status === "invalid") {
      focusFirstInvalidField(formRef.current);
    }
  }, [state]);

  const inviteUrl = state.status === "ok" ? inviteUrlOf(state.value) : null;

  return (
    <div className="space-y-lg">
      {inviteUrl === null ? (
        <p className="font-ui text-small text-ink-muted">
          El enlace vence. Generá uno nuevo para mandárselo.
        </p>
      ) : (
        <DonorInviteShare email={email} inviteUrl={inviteUrl} phone={phone} />
      )}
      <form ref={formRef} action={formAction} className="space-y-lg">
        <FormBusy>
          <HiddenValue name="userId" value={userId} />
          <SubmitButton tone="quiet" pendingLabel="Generando…">
            Volver a generar
          </SubmitButton>
          {state.status === "idle" || inviteUrl !== null ? null : (
            <p
              role={state.status === "ok" ? "status" : "alert"}
              className={`font-ui text-small ${state.status === "ok" ? "text-success" : state.status === "invalid" ? "text-ink" : "text-danger"}`}
            >
              {state.message}
            </p>
          )}
        </FormBusy>
      </form>
    </div>
  );
}

function FormBusy({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return <div aria-busy={pending || undefined}>{children}</div>;
}

function inviteUrlOf(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("inviteUrl" in value)) {
    return null;
  }

  const url = value.inviteUrl;

  return typeof url === "string" && url.length > 0 ? url : null;
}
