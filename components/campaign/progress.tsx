import { Callout } from "@/components/design-system/callout";
import { ProgressBar } from "@/components/design-system/figures";
import { formatMoney } from "@/src/domain/money";
import type { FundraisingProgress, MilestoneProgress } from "@/src/domain/progress";

/**
 * Cómo va la campaña: plata y obra, en ese orden y por separado.
 *
 * Son dos medidas distintas y presentarlas como una sola sería engañoso: un 60%
 * de la plata no es un 60% de la casa. La barra mide dinero; la línea de abajo
 * mide hitos.
 *
 * La fecha de conciliación va siempre pegada a la cifra. Un número sin fecha no
 * es un dato, es una afirmación.
 */

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function CampaignProgress({
  fundraising,
  milestones,
  reconciledAt,
  reconciliationIsStale,
  className,
}: {
  fundraising: FundraisingProgress;
  milestones: MilestoneProgress;
  reconciledAt: string | null;
  reconciliationIsStale: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <ProgressBar
        raised={fundraising.raised}
        goal={fundraising.goal}
        percent={fundraising.percent}
      />

      <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
        {reconciledAt === null
          ? "Todavía no hubo una conciliación bancaria, así que esta cifra es provisoria."
          : `Cifras conciliadas con el resumen del banco al ${formatDate(reconciledAt)}.`}
      </p>

      {fundraising.otherCurrencies.length === 0 ? null : (
        <p className="mt-xs max-w-measure font-ui text-small text-ink-muted" data-figure>
          También se recibieron{" "}
          {fundraising.otherCurrencies.map((amount) => formatMoney(amount)).join(" y ")}.
          No los convertimos a pesos: no hay un tipo de cambio con fecha que podamos
          publicar.
        </p>
      )}

      {milestones.totalCount === 0 ? null : (
        <p className="mt-lg max-w-measure text-body" data-figure>
          De la obra están completados {milestones.completedCount} de{" "}
          {milestones.totalCount} hitos.
        </p>
      )}

      {reconciliationIsStale ? (
        <Callout tone="warning" title="Dato desactualizado" className="mt-lg">
          <p>
            Pasaron más de treinta días desde la última conciliación. La cifra que ves
            puede estar atrasada respecto de lo que hay en la cuenta.
          </p>
        </Callout>
      ) : null}
    </div>
  );
}
