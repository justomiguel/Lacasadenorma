import Link from "next/link";

import { ADMIN_SECTIONS } from "@/components/admin/nav";
import { AdminHeading, Panel } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import { getTransparencyReport } from "@/src/application/use-cases/get-transparency-report";
import { formatMoney } from "@/src/domain/money";
import { can } from "@/src/domain/permissions";
import { getAdminContext } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";

/**
 * El tablero.
 *
 * Muestra **las cifras que el sitio está publicando en este momento**, leídas con el
 * mismo caso de uso que la página pública de transparencia y no con una consulta
 * propia. Es a propósito: la pregunta que trae a alguien acá es "¿lo que se ve afuera
 * está bien?", y dos consultas distintas para la misma cifra terminan divergiendo
 * justo cuando importa.
 *
 * Lo que sigue después son las secciones que el rol de quien mira puede usar. Un rol
 * de auditoría ve las de lectura y ninguna de escritura, y la diferencia se nota en la
 * pantalla antes de tocar nada.
 */
export default async function AdminPanelPage() {
  const viewer = await requirePermission("backoffice.acceder");
  const context = await getAdminContext();

  const report = await getTransparencyReport({
    dataLayer: getPublicDataLayer(),
    logger,
  });

  const sections = ADMIN_SECTIONS.filter((section) =>
    can(viewer.role, section.permission),
  );

  return (
    <>
      <AdminHeading title="Estado de la campaña">
        Esto es lo que el sitio está publicando ahora mismo.
      </AdminHeading>

      {context === null ? (
        <Callout tone="danger" title="Sin base de datos">
          <p>
            No hay un proyecto de Supabase configurado, así que el backoffice no puede
            leer ni escribir nada. El sitio público sigue funcionando con el contenido
            editorial.
          </p>
        </Callout>
      ) : null}

      {report.status === "ok" ? (
        <Panel id="cifras" title="Las cifras públicas" tone="sunk">
          <dl className="grid gap-lg sm:grid-cols-3">
            <div>
              <dt className="font-ui text-label uppercase tracking-label text-ink-muted">
                Recibido
              </dt>
              <dd data-figure className="mt-2xs font-ui text-figure text-ink">
                {formatMoney(report.data.summary.primary.received)}
              </dd>
            </div>
            <div>
              <dt className="font-ui text-label uppercase tracking-label text-ink-muted">
                Gastado
              </dt>
              <dd data-figure className="mt-2xs font-ui text-figure text-ink">
                {formatMoney(report.data.summary.primary.spent)}
              </dd>
            </div>
            <div>
              <dt className="font-ui text-label uppercase tracking-label text-ink-muted">
                Saldo
              </dt>
              <dd data-figure className="mt-2xs font-ui text-figure text-ink">
                {formatMoney(report.data.summary.primary.balance)}
              </dd>
            </div>
          </dl>

          <p className="mt-lg font-ui text-small text-ink-muted">
            {report.data.campaign.goal === null
              ? "Todavía no hay objetivo cargado, así que el sitio muestra el avance sin porcentaje."
              : `Objetivo publicado: ${formatMoney(report.data.campaign.goal)}.`}{" "}
            {report.data.summary.reconciledAt === null
              ? "Nunca se marcó una conciliación bancaria."
              : `Última conciliación: ${report.data.summary.reconciledAt.slice(0, 10)}.`}
          </p>

          {report.data.summary.reconciliationIsStale ? (
            <Callout tone="warning" title="Conciliación atrasada" className="mt-lg">
              <p>
                Pasaron más de treinta días desde la última conciliación y el sitio lo
                está avisando en la página de transparencia.{" "}
                {can(viewer.role, "finanzas.escribir") ? (
                  <Link
                    href="/admin/aportes"
                    className="text-aqua underline underline-offset-2"
                  >
                    Marcala cuando revises el resumen del banco
                  </Link>
                ) : (
                  "Alguien con permiso de finanzas puede marcarla."
                )}
                .
              </p>
            </Callout>
          ) : null}
        </Panel>
      ) : (
        <Panel id="cifras" title="Las cifras públicas">
          <p className="max-w-measure font-ui text-small text-ink-muted">
            Ahora mismo el sitio no está publicando cifras. Puede ser que la campaña
            todavía no esté publicada o que la base no responda; en cualquier caso, las
            páginas públicas muestran el aviso correspondiente en lugar de un cero.
          </p>
        </Panel>
      )}

      <Panel
        id="secciones"
        title="Qué podés hacer con tu rol"
        description="Las secciones que no aparecen son las que tu rol no puede usar."
      >
        <ul className="border-t border-rule">
          {sections.map((section) => (
            <li key={section.href} className="border-b border-rule">
              <Link
                href={section.href}
                className="flex min-h-touch flex-col justify-center py-md transition-colors duration-fast hover:bg-paper-sunk"
              >
                <span className="font-ui text-body text-ink">{section.label}</span>
                <span className="font-ui text-small text-ink-muted">
                  {section.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
