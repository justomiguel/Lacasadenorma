"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import {
  FieldErrorsContext,
  focusFirstInvalidField,
  IDLE_STATE,
  type ActionState,
} from "@/components/admin/form-action";
import { SubmitButton, TextField } from "@/components/admin/form";
import { PersonIcon } from "@/components/design-system/icons";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import type { ProvisionedDonor } from "@/src/application/admin";

import { DonorInviteShare } from "./donor-invite-share";

/**
 * Alta de quien donó por fuera. `ActionForm` no muestra `value`, y acá el
 * enlace (o la ficha que ya existía) vive en ese valor.
 */
export function DonorProvisionForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [phone, setPhone] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const raw = formData.get("phone");
      setPhone(typeof raw === "string" ? raw.trim() : "");
      return action(previous, formData);
    },
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.status === "invalid") {
      focusFirstInvalidField(formRef.current);
    }
  }, [state]);

  const provisioned = state.status === "ok" ? asProvisioned(state.value) : null;
  const created = provisioned !== null && !provisioned.alreadyExisted;

  return (
    <div className="space-y-lg">
      {created ? null : (
        <form ref={formRef} action={formAction} className="space-y-lg">
          <FormBusy>
            <FieldErrorsContext.Provider
              value={state.status === "invalid" ? state.fieldErrors : {}}
            >
              <TextField name="displayName" label="Nombre" required maxLength={80} />
              <TextField name="email" label="Correo" type="email" />
              <TextField name="phone" label="Teléfono" maxLength={80} />
              <SubmitButton pendingLabel="Creando…">
                <span className="inline-flex items-center gap-xs">
                  <IdentifyingMark>
                    <PersonIcon />
                  </IdentifyingMark>
                  Crear la cuenta
                </span>
              </SubmitButton>
            </FieldErrorsContext.Provider>
          </FormBusy>
        </form>
      )}
      <ProvisionResult state={state} provisioned={provisioned} phone={phone} />
    </div>
  );
}

function ProvisionResult({
  state,
  provisioned,
  phone,
}: {
  state: ActionState;
  provisioned: ProvisionedDonor | null;
  phone: string;
}) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "ok" && provisioned !== null && provisioned.alreadyExisted) {
    return (
      <p role="status" className="font-ui text-small text-success">
        {state.message}{" "}
        <Link
          href={`/admin/donantes/${provisioned.userId}`}
          className="underline decoration-1 underline-offset-4 hover:text-aqua-strong"
        >
          Ir a la ficha
        </Link>
      </p>
    );
  }

  if (state.status === "ok" && provisioned !== null) {
    return (
      <div className="space-y-md">
        <p role="status" className="font-ui text-small text-success">
          {state.message}
        </p>
        <DonorInviteShare
          email={provisioned.email}
          inviteUrl={provisioned.inviteUrl}
          phone={phone}
        />
      </div>
    );
  }

  if (state.status === "ok") {
    return (
      <p role="status" className="font-ui text-small text-success">
        {state.message}
      </p>
    );
  }

  return (
    <p
      role="alert"
      className={`font-ui text-small ${state.status === "invalid" ? "text-ink" : "text-danger"}`}
    >
      {state.message}
    </p>
  );
}

function FormBusy({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return <div aria-busy={pending || undefined}>{children}</div>;
}

function asProvisioned(value: unknown): ProvisionedDonor | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Partial<ProvisionedDonor>;

  if (
    typeof record.userId !== "string" ||
    typeof record.email !== "string" ||
    typeof record.inviteUrl !== "string" ||
    typeof record.alreadyExisted !== "boolean"
  ) {
    return null;
  }

  return {
    userId: record.userId,
    email: record.email,
    inviteUrl: record.inviteUrl,
    invented: record.invented === true,
    alreadyExisted: record.alreadyExisted,
  };
}
