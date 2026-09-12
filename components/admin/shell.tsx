import Link from "next/link";
import type { ReactNode } from "react";

import { Callout } from "@/components/design-system/callout";
import { cn } from "@/components/design-system/cn";
import { APP_ROLE_LABELS, type AppRole } from "@/src/domain/entities/role";
import { can } from "@/src/domain/permissions";

import { ADMIN_SECTIONS } from "./nav";

/**
 * El marco del backoffice.
 *
 * Se parece al sitio público —mismas fuentes, mismo papel, misma regla de un píxel—
 * pero es más denso y usa la tipografía de interfaz en lugar de la de lectura. La
 * razón no es estética: quien entra acá está trabajando, muchas veces parado en una
 * obra, y necesita ver muchas filas y tocar objetivos grandes, no leer prosa.
 *
 * Lo que **no** cambia respecto del sitio público: los tokens, el foco visible de
 * dos píxeles y los 44 px de objetivo táctil. Un backoffice inaccesible sería una
 * excepción a la accesibilidad justo en la parte del sistema que una persona usa
 * todos los días.
 */
export function AdminShell({
  role,
  email,
  children,
}: {
  role: AppRole | null;
  email: string | null;
  children: ReactNode;
}) {
  const sections = ADMIN_SECTIONS.filter((section) => can(role, section.permission));

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-page items-baseline justify-between gap-md px-md py-sm sm:px-lg">
          <Link
            href="/admin"
            className="font-ui text-label uppercase tracking-label text-ink"
          >
            Casa de Norma · Backoffice
          </Link>
          <p className="font-ui text-label text-ink-muted">
            {role === null ? "Sin rol asignado" : APP_ROLE_LABELS[role]}
            {email === null ? null : <span className="hidden sm:inline"> · {email}</span>}
          </p>
        </div>

        {sections.length === 0 ? null : (
          <nav aria-label="Secciones del backoffice" className="border-t border-rule">
            {/*
             * Desplazamiento horizontal en el teléfono en lugar de un menú
             * desplegable: siete secciones entran en dos gestos, y un menú agrega un
             * toque a cada navegación de un trabajo que se hace muchas veces por día.
             */}
            <ul className="mx-auto flex max-w-page gap-lg overflow-x-auto px-md py-xs sm:px-lg">
              {sections.map((section) => (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    className="inline-flex min-h-touch items-center whitespace-nowrap font-ui text-small text-ink-muted transition-colors duration-fast hover:text-ink"
                  >
                    {section.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="contenido" className="mx-auto max-w-page px-md py-xl sm:px-lg">
        {children}
      </main>
    </div>
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
 * el otro cargando una campaña— así que se dicen distinto. Nunca se muestra una lista
 * vacía sin explicación (FR-035).
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
        cargue acá. La primera campaña se crea con una migración o desde el panel de
        Supabase.
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
