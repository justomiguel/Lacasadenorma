import { HelpCta } from "@/components/campaign/help-cta";
import { Unavailable } from "@/components/campaign/unavailable";
import { InlineLink } from "@/components/design-system/actions";
import { Callout, EmptyState } from "@/components/design-system/callout";
import { Stat, StatGroup } from "@/components/design-system/figures";
import { Container, Section } from "@/components/design-system/layout";
import { Ledger } from "@/components/design-system/ledger";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { transparency as content } from "@/content";
import { getTransparencyReport } from "@/src/application/use-cases/get-transparency-report";
import { EXPENSE_CATEGORY_LABELS } from "@/src/domain/entities";
import { formatMoney } from "@/src/domain/money";
import { formatPercentage } from "@/src/domain/percentage";
import type { CurrencyTotals } from "@/src/domain/transparency";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * La rendición de cuentas.
 *
 * El orden importa y es al revés del que pediría el pudor: primero las cifras,
 * después el detalle que las sustenta, y al final el método. Quien entra a esta
 * página quiere ver el número; explicarle el procedimiento antes de mostrárselo se
 * lee como una excusa.
 *
 * Las tres cifras y el libro de abajo vienen de la **misma** lectura, no de dos
 * consultas: SC-007 exige que la suma del detalle publicado sea exactamente el
 * total publicado, y dos consultas pueden divergir entre sí sin que nadie se
 * entere.
 */
/**
 * Cinco minutos de atraso máximo para las cifras (ADR-017). Las acciones del
 * backoffice invalidan esta ruta al publicar, así que en la práctica el dato aparece
 * al instante; esto es el piso para lo que se cambie fuera del backoffice.
 */
export const revalidate = 300;

export const metadata = pageMetadata({
  title: content.title,
  description:
    "Total recibido, total gastado, saldo y el detalle de cada gasto con su fecha, su concepto y si tiene comprobante. Cómo se lleva la cuenta, explicado.",
  path: "/transparencia",
});

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Las tres cifras de una moneda. Se repite tal cual para cada moneda presente. */
function CurrencyBlock({ totals, label }: { totals: CurrencyTotals; label?: string }) {
  return (
    <div>
      {label === undefined ? null : (
        <p className="mb-md font-ui text-label text-ink-muted">{label}</p>
      )}
      <StatGroup>
        <Stat label={`Recibido en ${totals.currency}`} amount={totals.received} />
        <Stat label="Gastado" amount={totals.spent} />
        <Stat
          label="Saldo"
          amount={totals.balance}
          {...(totals.executedPercent === null
            ? {}
            : {
                note: `${formatPercentage(totals.executedPercent)} del objetivo ya ejecutado`,
              })}
        />
      </StatGroup>
    </div>
  );
}

export default async function TransparenciaPage() {
  const report = await getTransparencyReport({
    dataLayer: getPublicDataLayer(),
    logger,
  });

  return (
    <>
      <PageHeader title={content.title} lead={content.lead} />

      <Container>
        <Section labelledBy="cifras">
          <SectionHeading title="Cuánto entró y cuánto salió" id="cifras" />

          {report.status === "ok" ? (
            <div className="space-y-2xl">
              <CurrencyBlock totals={report.data.summary.primary} />

              {report.data.summary.others.map((totals) => (
                <CurrencyBlock
                  key={totals.currency}
                  totals={totals}
                  label={`Recibido en otra moneda (${totals.currency})`}
                />
              ))}

              <p className="max-w-measure font-ui text-small text-ink-muted">
                {report.data.summary.reconciledAt === null
                  ? "Todavía no hubo una conciliación con el resumen del banco, así que estas cifras son provisorias."
                  : `Conciliado con el resumen del banco al ${formatDate(report.data.summary.reconciledAt)}.`}
                {report.data.summary.others.length === 0
                  ? null
                  : " Las monedas no se suman entre sí: no hay un tipo de cambio con fecha que podamos publicar."}
              </p>

              {report.data.summary.reconciliationIsStale ? (
                <Callout tone="warning" title="Dato desactualizado">
                  <p>
                    Pasaron más de treinta días desde la última conciliación. Las cifras
                    de arriba pueden estar atrasadas respecto de lo que hay en la cuenta.
                  </p>
                </Callout>
              ) : null}
            </div>
          ) : (
            <Unavailable reason={report.reason} />
          )}
        </Section>
      </Container>

      {report.status === "ok" && report.data.summary.byCategory.length > 0 ? (
        <Container>
          <Section className="border-t border-rule" labelledBy="por-rubro">
            <SectionHeading title="En qué se gastó" id="por-rubro" />
            <dl className="max-w-measure border-t border-rule">
              {report.data.summary.byCategory.map((entry) => (
                <div
                  key={entry.category}
                  className="flex items-baseline justify-between gap-md border-b border-rule py-sm"
                >
                  <dt className="text-body">{EXPENSE_CATEGORY_LABELS[entry.category]}</dt>
                  <dd className="font-ui text-subheading font-medium" data-figure>
                    {formatMoney(entry.amount)}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </Container>
      ) : null}

      <Container>
        <Section className="border-t border-rule" labelledBy="libro">
          <SectionHeading title="Cada gasto, uno por uno" id="libro" />

          {report.status === "ok" ? (
            report.data.summary.expenseCount === 0 ? (
              <EmptyState title="Todavía no se gastó nada">
                <p>
                  Los aportes están en la cuenta y sin ejecutar. Cuando se pague el primer
                  material va a aparecer acá, con su fecha y su comprobante.
                </p>
              </EmptyState>
            ) : (
              <>
                <Ledger
                  expenses={report.data.summary.expenses}
                  caption={`${String(report.data.summary.expenseCount)} gastos publicados. La suma de esta tabla es el total gastado de más arriba.`}
                />
                <p className="mt-lg max-w-measure font-ui text-small text-ink-muted">
                  {report.data.summary.receiptCount === 0
                    ? "Ninguno de estos gastos tiene todavía su comprobante cargado."
                    : `Hay ${String(report.data.summary.receiptCount)} comprobantes archivados. Los archivos no se publican porque suelen tener datos de terceros: los puede revisar una persona con rol de auditoría.`}
                </p>
              </>
            )
          ) : (
            <Unavailable reason={report.reason} />
          )}
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="metodo">
          <SectionHeading title="Cómo se lleva la cuenta" id="metodo" />
          <Paragraphs items={content.method} />
          {content.paragraphs.length === 0 ? null : (
            <Paragraphs items={content.paragraphs} className="mt-lg" />
          )}
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">Sumar a la cuenta</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            Todo lo que entre por acá va a aparecer en esta misma página, con su fecha.{" "}
            <InlineLink href="/novedades">Las novedades</InlineLink> cuentan cada avance a
            medida que pasa.
          </p>
          <div className="mt-lg">
            <HelpCta origen="transparencia" />
          </div>
        </Section>
      </Container>
    </>
  );
}
