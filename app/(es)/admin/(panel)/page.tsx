import Link from "next/link";

import { ADMIN_SECTIONS } from "@/components/admin/nav";
import { AdminHeading, Panel } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import { getTransparencyReport } from "@/src/application/use-cases/get-transparency-report";
import { formatMoney } from "@/src/domain/money";
import { formatPercentage } from "@/src/domain/percentage";
import { can } from "@/src/domain/permissions";
import { getAdminContext } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";

/**
 * El tablero.
 *
 * Muestra **el libro en pesos** y, al lado, **los porcentajes que el sitio público
 * está publicando**, leídos con el mismo caso de uso que `/transparencia`. Es a
 * propósito: la pregunta que trae a alguien acá es "¿lo que se ve afuera está
 * bien?", y dos consultas distintas para la misma cifra terminan divergiendo justo
 * cuando importa. El objetivo de recaudación, si está cargado, queda acá: afuera
 * no se publica (ADR-040).
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
        El libro está en pesos. El sitio público lo traduce a porcentajes de lo ya
        recibido; este objetivo, si lo cargás, no se publica.
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

      {context !== null && context.campaign === null ? (
        <Callout tone="warning" title="Todavía no hay campaña">
          <p>
            Gastos, aportes y el catálogo se anotan sobre una campaña, y todavía no hay
            ninguna.{" "}
            {can(viewer.role, "campana.escribir") ? (
              <Link
                href="/admin/objetivos"
                className="text-aqua underline underline-offset-2"
              >
                Creala en Objetivo
              </Link>
            ) : (
              "Quien administra la campaña tiene que crearla en Objetivo."
            )}
          </p>
        </Callout>
      ) : null}

      {report.status === "ok" ? (
        <Panel id="cifras" title="El libro y lo que ve el sitio" tone="sunk">
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
            {report.data.summary.primary.executedPercent === null ||
            report.data.summary.primary.remainingPercent === null
              ? "Todavía no hay recibido conciliado, así que el sitio no publica porcentajes."
              : `El sitio público dice que se usó el ${formatPercentage(report.data.summary.primary.executedPercent)} de lo que ya llegó y que el ${formatPercentage(report.data.summary.primary.remainingPercent)} sigue en la cuenta.`}
          </p>
          <p className="mt-sm font-ui text-small text-ink-muted">
            {report.data.campaign.goal === null
              ? "Todavía no hay objetivo interno. Si lo cargás en Objetivo, queda acá: el sitio público no lo usa como 100%."
              : `Objetivo interno (no se publica): ${formatMoney(report.data.campaign.goal)}.`}{" "}
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
        <Panel id="cifras" title="El libro y lo que ve el sitio">
          <p className="max-w-measure font-ui text-small text-ink-muted">
            Ahora mismo el sitio no está publicando porcentajes. Puede ser que la campaña
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
