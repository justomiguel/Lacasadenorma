"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/admin/form";

import { signIn, type LoginState } from "./actions";

/**
 * La pantalla de acceso.
 *
 * Un formulario de dos campos y nada más: sin "recordarme", sin enlaces sociales, sin
 * ilustración. Quien llega acá ya sabe qué es esto.
 *
 * `autoComplete` está puesto a propósito en los dos campos: un gestor de contraseñas
 * que funciona es la diferencia entre una contraseña larga y una que alguien se pueda
 * acordar, y en un teléfono es la diferencia entre entrar y desistir.
 */
export function LoginForm({ next }: { next: string | null }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signIn, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-lg">
      {next === null ? null : <input type="hidden" name="volver" value={next} />}

      <div className="space-y-2xs">
        <label htmlFor="email" className="block font-ui text-small font-medium">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          className="w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body"
        />
      </div>

      <div className="space-y-2xs">
        <label htmlFor="password" className="block font-ui text-small font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body"
        />
      </div>

      {state.error === null ? null : (
        <p role="alert" className="font-ui text-small text-danger">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
    </form>
  );
}
