import type { Permission } from "@/src/domain/permissions";

/**
 * Las secciones del backoffice y el permiso que cada una necesita.
 *
 * La navegación se **filtra** con esta tabla en lugar de mostrar todo y rechazar
 * después. Un enlace que lleva a una pantalla que dice "no tenés permiso" es una
 * promesa incumplida en la interfaz: no es un problema de seguridad —la guarda y la
 * policy siguen ahí— pero es un problema de producto, y es igual de evitable.
 */
export interface AdminSection {
  readonly href: string;
  readonly label: string;
  readonly permission: Permission;
  readonly description: string;
}

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    href: "/admin/novedades",
    label: "Novedades",
    permission: "contenido.escribir",
    description: "Escribir un avance, subir fotos y publicarlo.",
  },
  {
    href: "/admin/gastos",
    label: "Gastos",
    permission: "finanzas.leer",
    description: "Registrar lo que se pagó y archivar el comprobante.",
  },
  {
    href: "/admin/aportes",
    label: "Aportes",
    permission: "finanzas.leer",
    description: "Registrar lo que entró y marcar la conciliación.",
  },
  {
    href: "/admin/hitos",
    label: "Hitos",
    permission: "hitos.escribir",
    description: "El avance de la obra, paso por paso.",
  },
  {
    href: "/admin/objetivos",
    label: "Objetivo",
    permission: "campana.escribir",
    description: "La meta de recaudación y los rubros del presupuesto.",
  },
  {
    href: "/admin/cuentas",
    label: "Cuentas",
    permission: "cuentas.escribir",
    description: "Los datos bancarios que se publican para transferir.",
  },
  {
    href: "/admin/auditoria",
    label: "Auditoría",
    permission: "auditoria.leer",
    description: "Quién cambió qué, y cuándo.",
  },
];
