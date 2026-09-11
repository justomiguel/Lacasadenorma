"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { logger } from "@/src/infrastructure/logging/logger";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server-client";

/**
 * Entrar y salir.
 *
 * Tres decisiones que importan:
 *
 * **1. El mensaje de error no distingue entre "ese correo no existe" y "la contraseña
 * está mal".** Distinguirlos convierte el formulario en un verificador de correos
 * registrados, que es información útil para quien prueba credenciales robadas
 * (amenaza S1). Supabase tampoco los distingue en su respuesta, y acá se mantiene.
 *
 * **2. El destino tras entrar se valida.** Llega en la query como `volver`, y aceptar
 * cualquier cadena sería un redirect abierto: una URL con `volver=https://otro-sitio`
 * convertiría la pantalla de acceso del proyecto en un trampolín para phishing. Sólo
 * se aceptan rutas internas que empiezan con `/admin`.
 *
 * **3. No se registra el correo en ningún log.** El logger lo redactaría igual, pero
 * el dato que sirve para diagnosticar es "hubo un intento fallido", no de quién.
 */

export type LoginState = { readonly error: string | null };

const schema = z.object({
  email: z
    .string({ error: "Escribí tu correo." })
    .trim()
    .min(1, "Escribí tu correo.")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Ese correo no parece válido."),
  password: z
    .string({ error: "Escribí tu contraseña." })
    .min(1, "Escribí tu contraseña."),
  next: z.string().optional(),
});

/** Sólo rutas internas del backoffice. Todo lo demás cae en `/admin`. */
function safeDestination(candidate: string | undefined): string {
  if (candidate === undefined) {
    return "/admin";
  }

  return /^\/admin(\/[\w\-/]*)?$/.test(candidate) ? candidate : "/admin";
}

export async function signIn(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("volver") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return {
      error: "Falta configurar el proyecto de Supabase. Sin eso no hay sesión posible.",
    };
  }

  const { error } = await client.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error !== null) {
    logger.warn("Intento de acceso fallido al backoffice", { code: error.code });

    return { error: "Esos datos no coinciden con ninguna cuenta." };
  }

  redirect(safeDestination(parsed.data.next));
}

export async function signOut(): Promise<void> {
  const client = await createServerSupabaseClient();

  if (client !== null) {
    await client.auth.signOut();
  }

  redirect("/admin/login");
}
