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
    href: "/admin/metricas",
    label: "Métricas",
    permission: "metricas.leer",
    description: "El pulso de la campaña, con gráficos y señales.",
  },
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
    href: "/admin/catalogo",
    label: "Catálogo",
    permission: "catalogo.escribir",
    description: "Qué le falta a la casa, en especie, y cuánto.",
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
    href: "/admin/donaciones",
    label: "Donaciones",
    permission: "donaciones.leer",
    description: "Confirmar la llegada del material y cancelar una reserva.",
  },
  {
    href: "/admin/donantes",
    label: "Donantes",
    permission: "donaciones.leer",
    description: "Habilitar cuentas del público y ver quién se ofreció a traer algo.",
  },
  {
    href: "/admin/auditoria",
    label: "Auditoría",
    permission: "auditoria.leer",
    description: "Quién cambió qué, y cuándo.",
  },
];

/**
 * Cómo se agrupa el menú: un enlace afuera, pestañas adentro.
 *
 * Campaña y Plata juntan las que se recorren juntas. Catálogo, Donaciones
 * y Donantes van cada uno al costado: no son un mismo recorrido. Métricas
 * y Auditoría quedan solas porque no son hermanas de nadie.
 */
export interface AdminGroup {
  readonly id: string;
  readonly label: string;
  readonly hrefs: readonly string[];
}

export const ADMIN_GROUPS: readonly AdminGroup[] = [
  {
    id: "campana",
    label: "Campaña",
    hrefs: ["/admin/novedades", "/admin/hitos", "/admin/objetivos"],
  },
  {
    id: "plata",
    label: "Plata",
    hrefs: ["/admin/aportes", "/admin/gastos", "/admin/cuentas"],
  },
  { id: "catalogo", label: "Catálogo", hrefs: ["/admin/catalogo"] },
  { id: "donaciones", label: "Donaciones", hrefs: ["/admin/donaciones"] },
  { id: "donantes", label: "Donantes", hrefs: ["/admin/donantes"] },
  { id: "metricas", label: "Métricas", hrefs: ["/admin/metricas"] },
  { id: "auditoria", label: "Auditoría", hrefs: ["/admin/auditoria"] },
];

export interface VisibleAdminGroup {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly sections: readonly AdminSection[];
}

/** `/admin/novedades/id` sigue marcando Novedades; `/admin` no marca a nadie. */
export function sectionIsCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function visibleAdminGroups(
  sections: readonly AdminSection[],
): readonly VisibleAdminGroup[] {
  const byHref = new Map(sections.map((section) => [section.href, section]));

  return ADMIN_GROUPS.flatMap((group) => {
    const visible = group.hrefs.flatMap((href) => {
      const section = byHref.get(href);

      return section === undefined ? [] : [section];
    });
    const first = visible[0];

    if (first === undefined) {
      return [];
    }

    return [{ id: group.id, label: group.label, href: first.href, sections: visible }];
  });
}

export function groupContaining(
  pathname: string,
  groups: readonly VisibleAdminGroup[],
): VisibleAdminGroup | null {
  return (
    groups.find((group) =>
      group.sections.some((section) => sectionIsCurrent(pathname, section.href)),
    ) ?? null
  );
}

export function groupHrefForPath(pathname: string, group: VisibleAdminGroup): string {
  const current = group.sections.find((section) =>
    sectionIsCurrent(pathname, section.href),
  );

  return current?.href ?? group.href;
}
