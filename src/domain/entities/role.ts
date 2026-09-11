/**
 * Roles del backoffice, del menos al más privilegiado. El orden del array **es**
 * la jerarquía: `hasMinRole` lo usa, y la función SQL `private.has_min_role`
 * replica exactamente esta escala.
 *
 * `auditor` está primero a propósito: es el rol de lectura total sin escritura,
 * el que permite que alguien externo a la familia verifique sin poder alterar
 * nada. No es "menos que editor" en confianza, es menos en capacidad de cambio.
 */
export const APP_ROLES = ["auditor", "editor", "admin", "owner"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  auditor: "Auditoría",
  editor: "Edición",
  admin: "Administración",
  owner: "Propiedad",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * `auditor` es un caso especial: tiene lectura total pero ninguna escritura, así
 * que la jerarquía numérica no alcanza para decidir permisos de escritura. Las
 * capacidades concretas se resuelven en `permissions.ts`.
 */
export function roleRank(role: AppRole): number {
  return APP_ROLES.indexOf(role);
}

export function hasMinRole(role: AppRole | null, minimum: AppRole): boolean {
  if (role === null) {
    return false;
  }

  return roleRank(role) >= roleRank(minimum);
}
