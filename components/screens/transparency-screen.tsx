import { HelpCta } from "@/components/campaign/help-cta";
import { Unavailable } from "@/components/campaign/unavailable";
import { InlineLink } from "@/components/design-system/actions";
import { Callout, EmptyState } from "@/components/design-system/callout";
import { formatLongDate } from "@/components/design-system/dates";
import { Stat, StatGroup } from "@/components/design-system/figures";
import { Container, Section } from "@/components/design-system/layout";
import { Ledger } from "@/components/design-system/ledger";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import type { UiContent } from "@/content/schema";
import { getTransparencyReport } from "@/src/application/use-cases/get-transparency-report";
import { formatMoney } from "@/src/domain/money";
import { formatPercentage } from "@/src/domain/percentage";
import type { CurrencyTotals } from "@/src/domain/transparency";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import { intlLocale, type Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function transparencyMetadata(locale: Locale) {
  const { transparency, ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: transparency.title,
    description: ui.transparencyPage.seoDescription,
    path: "/transparencia",
  });
}

/** Las tres cifras de una moneda. Se repite tal cual para cada moneda presente. */
function CurrencyBlock({
  totals,
  label,
  locale,
  ui,
}: {
  totals: CurrencyTotals;
  label?: string;
  locale: Locale;
  ui: UiContent;
}) {
  const intl = intlLocale(locale);

  return (
    <div>
      {label === undefined ? null : (
        <p className="mb-md font-ui text-label text-ink-muted">{label}</p>
      )}
      <StatGroup>
        <Stat
          label={fill(ui.figures.receivedIn, { currency: totals.currency })}
          amount={totals.received}
          locale={locale}
        />
        <Stat label={ui.figures.spent} amount={totals.spent} locale={locale} />
        <Stat
          label={ui.figures.balance}
          amount={totals.balance}
          locale={locale}
          {...(totals.executedPercent === null
            ? {}
            : {
                note: fill(ui.figures.executedNote, {
                  percent: formatPercentage(totals.executedPercent, { locale: intl }),
                }),
              })}
        />
      </StatGroup>
    </div>
  );
}

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
export async function TransparencyScreen({ locale }: { locale: Locale }) {
  const { transparency: content, ui } = getContent(locale);
  const intl = intlLocale(locale);
  const report = await getTransparencyReport({
    dataLayer: getPublicDataLayer(),
    logger,
  });

  return (
    <>
      <PageHeader title={content.title} lead={content.lead} />

      <Container>
        <Section labelledBy="cifras">
          <SectionHeading title={ui.transparencyPage.totalsHeading} id="cifras" />

          {report.status === "ok" ? (
            <div className="space-y-2xl">
              <CurrencyBlock
                totals={report.data.summary.primary}
                locale={locale}
                ui={ui}
              />

              {report.data.summary.others.map((totals) => (
                <CurrencyBlock
                  key={totals.currency}
                  totals={totals}
                  locale={locale}
                  ui={ui}
                  label={fill(ui.figures.otherCurrency, { currency: totals.currency })}
                />
              ))}

              <p className="max-w-measure font-ui text-small text-ink-muted">
                {report.data.summary.reconciledAt === null
                  ? ui.transparencyPage.noReconciliation
                  : fill(ui.transparencyPage.reconciledOn, {
                      date: formatLongDate(report.data.summary.reconciledAt, intl),
                    })}
                {report.data.summary.others.length === 0
                  ? null
                  : ui.transparencyPage.currenciesNote}
              </p>

              {report.data.summary.reconciliationIsStale ? (
                <Callout tone="warning" title={ui.transparencyPage.staleTitle}>
                  <p>{ui.transparencyPage.staleBody}</p>
                </Callout>
              ) : null}
            </div>
          ) : (
            <Unavailable reason={report.reason} copy={ui.unavailable} />
          )}
        </Section>
      </Container>

      {report.status === "ok" && report.data.summary.byCategory.length > 0 ? (
        <Container>
          <Section className="border-t border-rule" labelledBy="por-rubro">
            <SectionHeading
              title={ui.transparencyPage.byCategoryHeading}
              id="por-rubro"
            />
            <dl className="max-w-measure border-t border-rule">
              {report.data.summary.byCategory.map((entry) => (
                <div
                  key={entry.category}
                  className="flex items-baseline justify-between gap-md border-b border-rule py-sm"
                >
                  <dt className="text-body">{ui.expenseCategories[entry.category]}</dt>
                  <dd className="font-ui text-subheading font-medium" data-figure>
                    {formatMoney(entry.amount, intlLocale(locale))}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </Container>
      ) : null}

      <Container>
        <Section className="border-t border-rule" labelledBy="libro">
          <SectionHeading title={ui.transparencyPage.ledgerHeading} id="libro" />

          {report.status === "ok" ? (
            report.data.summary.expenseCount === 0 ? (
              <EmptyState title={ui.transparencyPage.noExpensesTitle}>
                <p>{ui.transparencyPage.noExpensesBody}</p>
              </EmptyState>
            ) : (
              <>
                <Ledger
                  expenses={report.data.summary.expenses}
                  caption={fill(ui.ledger.caption, {
                    count: String(report.data.summary.expenseCount),
                  })}
                  locale={locale}
                  ledger={ui.ledger}
                  categories={ui.expenseCategories}
                />
                <p className="mt-lg max-w-measure font-ui text-small text-ink-muted">
                  {report.data.summary.receiptCount === 0
                    ? ui.transparencyPage.noReceipts
                    : fill(ui.transparencyPage.receiptsNote, {
                        count: String(report.data.summary.receiptCount),
                      })}
                </p>
              </>
            )
          ) : (
            <Unavailable reason={report.reason} copy={ui.unavailable} />
          )}
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="metodo">
          <SectionHeading title={ui.transparencyPage.methodHeading} id="metodo" />
          <Paragraphs items={content.method} />
          {content.paragraphs.length === 0 ? null : (
            <Paragraphs items={content.paragraphs} className="mt-lg" />
          )}
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-display text-heading">{ui.transparencyPage.helpHeading}</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            {ui.transparencyPage.helpLead}{" "}
            <InlineLink href={localizedHref("/novedades", locale)}>
              {ui.transparencyPage.newsLink}
            </InlineLink>{" "}
            {ui.transparencyPage.helpLeadTail}
          </p>
          <div className="mt-lg">
            <HelpCta
              origen="transparencia"
              href={localizedHref("/ayudar", locale)}
              label={ui.helpCta}
            />
          </div>
        </Section>
      </Container>
    </>
  );
}
