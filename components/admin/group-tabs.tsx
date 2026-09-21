"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import {
  BankIcon,
  BookIcon,
  BoxIcon,
  FlagIcon,
  GiftIcon,
  HeartIcon,
  type IconProps,
  PersonIcon,
  ReceiptIcon,
  TargetIcon,
} from "@/components/design-system/icons";
import { cn } from "@/components/design-system/cn";

import type { AdminSection } from "./nav";
import { groupContaining, sectionIsCurrent, visibleAdminGroups } from "./nav";

const SECTION_MARK: Record<string, ComponentType<IconProps>> = {
  "/admin/novedades": BookIcon,
  "/admin/hitos": FlagIcon,
  "/admin/objetivos": TargetIcon,
  "/admin/aportes": HeartIcon,
  "/admin/gastos": ReceiptIcon,
  "/admin/cuentas": BankIcon,
  "/admin/catalogo": BoxIcon,
  "/admin/donaciones": GiftIcon,
  "/admin/donantes": PersonIcon,
};

/**
 * Pestañas del grupo abierto: las secciones hermanas, adentro del contenedor.
 *
 * El menú al costado tiene un enlace por grupo. Acá se cambia de pantalla
 * sin volver a desplegar las once. Un grupo de una sola sección no pinta
 * pestañas.
 */
export function AdminGroupTabs({ sections }: { sections: readonly AdminSection[] }) {
  const pathname = usePathname();
  const group = groupContaining(pathname, visibleAdminGroups(sections));

  if (group === null || group.sections.length < 2) {
    return null;
  }

  return (
    <div
      role="tablist"
      aria-label={group.label}
      className="mb-xl flex min-w-0 max-w-full overflow-x-auto overscroll-x-contain border-b border-rule"
    >
      {group.sections.map((section) => {
        const selected = sectionIsCurrent(pathname, section.href);
        const Mark = SECTION_MARK[section.href];

        return (
          <Link
            key={section.href}
            href={section.href}
            role="tab"
            aria-selected={selected}
            className={cn(
              "inline-flex min-h-touch shrink-0 items-center gap-sm whitespace-nowrap px-md font-ui text-body transition-colors duration-fast first:pl-0",
              selected ? "font-medium text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {Mark === undefined ? null : (
              <IdentifyingMark>
                <Mark />
              </IdentifyingMark>
            )}
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
