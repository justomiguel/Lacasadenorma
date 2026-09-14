import {
  parseSocialProviders,
  type SocialProviderId,
} from "@/src/domain/auth/social-providers";

/**
 * Los proveedores que esta instancia muestra.
 *
 * `AUTH_SOCIAL_PROVIDERS` es del servidor y **no** lleva `NEXT_PUBLIC_`: no es
 * un secreto, pero tampoco es un dato que el navegador tenga que conocer por
 * su cuenta. La página, que es un Server Component, lee acá y baja la lista
 * por props. Un módulo `"use client"` que leyera el entorno no vería el valor
 * y `check:secrets` lo rechazaría.
 *
 * Vacía o ausente: ningún botón. Habilitar Google en el panel de Supabase y
 * no poner `google` acá es deliberado: el panel dice "Auth puede hablar con
 * Google"; esto dice "este sitio le ofrece Google a la persona".
 */
export function enabledSocialProviders(
  raw: string | undefined = process.env.AUTH_SOCIAL_PROVIDERS,
): readonly SocialProviderId[] {
  return parseSocialProviders(raw).providers;
}

export function unknownSocialProviders(
  raw: string | undefined = process.env.AUTH_SOCIAL_PROVIDERS,
): readonly string[] {
  return parseSocialProviders(raw).unknown;
}
