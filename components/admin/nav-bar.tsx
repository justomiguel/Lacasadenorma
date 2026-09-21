"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import {
  BankIcon,
  BookIcon,
  BoxIcon,
  ChartIcon,
  GiftIcon,
  type IconProps,
  PersonIcon,
  SearchIcon,
} from "@/components/design-system/icons";
import { sidebarItemClass } from "@/components/design-system/work-sidebar";

import type { AdminSection } from "./nav";
import { groupHrefForPath, sectionIsCurrent, visibleAdminGroups } from "./nav";

const GROUP_MARK: Record<string, ComponentType<IconProps>> = {
  campana: BookIcon,
  plata: BankIcon,
  catalogo: BoxIcon,
  donaciones: GiftIcon,
  donantes: PersonIcon,
  metricas: ChartIcon,
  auditoria: SearchIcon,
};

export { sectionIsCurrent };

/** Submenú del backoffice: los grupos que el rol puede ver, no las once secciones. */
export function AdminNav({ sections }: { sections: readonly AdminSection[] }) {
  const pathname = usePathname();
  const groups = visibleAdminGroups(sections);

  if (groups.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label="Secciones del backoffice"
      className="mt-2xs flex flex-col gap-xs border-l border-rule pl-sm"
    >
      {groups.map((group) => {
        const current = group.sections.some((section) =>
          sectionIsCurrent(pathname, section.href),
        );
        const Mark = GROUP_MARK[group.id];

        return (
          <li key={group.id}>
            <Link
              href={groupHrefForPath(pathname, group)}
              {...(current ? { "aria-current": "page" as const } : {})}
              className={sidebarItemClass(current)}
            >
              {Mark === undefined ? null : (
                <IdentifyingMark>
                  <Mark />
                </IdentifyingMark>
              )}
              {group.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
