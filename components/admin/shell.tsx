import Link from "next/link";
import type { ReactNode } from "react";

import { Callout } from "@/components/design-system/callout";
import { cn } from "@/components/design-system/cn";
import { WorkNav } from "@/components/design-system/work-nav";
import { WorkSidebar } from "@/components/design-system/work-sidebar";
import { getContent } from "@/content";
import type { AppRole } from "@/src/domain/entities/role";
import { can } from "@/src/domain/permissions";

import { AdminGroupTabs } from "./group-tabs";
import { ADMIN_SECTIONS } from "./nav";

/**
 * El marco del backoffice.
 *
 * El mismo menú que `/cuenta`: la cuenta arriba, el backoffice al
 * costado. Campaña y Plata agrupan hermanas en pestañas; Catálogo,
 * Donaciones y Donantes son un enlace cada uno.
 * El `main` lo pone `PublicDocument`; acá no se anida otro.
 */
export function AdminShell({
  role,
  footer,
  children,
}: {
  role: AppRole | null;
  footer: ReactNode;
  children: ReactNode;
}) {
  const { account, ui } = getContent("es");
  const sections = ADMIN_SECTIONS.filter((section) => can(role, section.permission));

  return (
    <WorkSidebar
      accountHref="/cuenta"
      emptyName={ui.account}
      nav={
        <WorkNav
          locale="es"
          copy={account.profile}
          currentAccount={null}
          adminSections={sections}
          backofficeLabel={ui.backoffice}
        />
      }
      footer={footer}
    >
      <AdminGroupTabs sections={sections} />
      {children}
    </WorkSidebar>
  );
}

/** Encabezado de una pantalla del backoffice. Uno por página (FR-004). */
export function AdminHeading({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-xl flex flex-wrap items-start justify-between gap-md">
      <div>
        <h1 className="font-display text-heading text-ink">{title}</h1>
        {children === undefined ? null : (
          <div className="mt-2xs max-w-measure font-ui text-small text-ink-muted">
            {children}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * Un bloque de trabajo: un formulario, una lista. Lleva su propio encabezado
 * asociado por `aria-labelledby`, para que la página se pueda recorrer por secciones
 * con un lector de pantalla.
 */
export function Panel({
  title,
  id,
  children,
  description,
  className,
  tone = "plain",
}: {
  title: string;
  id: string;
  children: ReactNode;
  description?: string;
  className?: string;
  tone?: "plain" | "sunk";
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "mb-2xl",
        tone === "sunk" ? "rounded-sm bg-paper-sunk p-md sm:p-lg" : "",
        className,
      )}
    >
      <h2 id={id} className="font-ui text-subheading font-medium text-ink">
        {title}
      </h2>
      {description === undefined ? null : (
        <p className="mt-2xs max-w-measure font-ui text-small text-ink-muted">
          {description}
        </p>
      )}
      <div className="mt-lg">{children}</div>
    </section>
  );
}

/**
 * Por qué una pantalla no tiene nada que mostrar.
 *
 * Los dos motivos se resuelven de maneras distintas —uno con variables de entorno,
 * el otro cargando una campaña desde Objetivo— así que se dicen distinto. Nunca se
 * muestra una lista vacía sin explicación (FR-035).
 */
export function SinDatos({ state }: { state: "sin-base" | "sin-campana" }) {
  if (state === "sin-base") {
    return (
      <Callout tone="danger" title="Sin base de datos">
        <p>
          El backoffice necesita las variables de entorno de Supabase para funcionar.
          Están listadas en <code>.env.example</code>.
        </p>
      </Callout>
    );
  }

  return (
    <Callout tone="danger" title="Sin campaña cargada">
      <p>
        Todavía no hay una campaña en la base, así que no hay a qué asociar lo que se
        cargue acá.{" "}
        <Link href="/admin/objetivos" className="text-aqua underline underline-offset-2">
          Creala en Objetivo
        </Link>
        , y después volvé a esta pantalla para anotar gastos, aportes o lo que hace falta.
      </p>
    </Callout>
  );
}

/** Dos columnas en escritorio, una en el teléfono. El formulario primero. */
export function AdminColumns({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-2xl lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      {children}
    </div>
  );
}
