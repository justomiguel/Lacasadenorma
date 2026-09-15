import { formatPercentage } from "@/src/domain/percentage";
import type { UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { intlLocale, type Locale } from "@/src/i18n/locale";

import { cn } from "./cn";

const DEFAULT_FIGURES: UiContent["figures"] = {
  received: "Recibido",
  receivedIn: "Recibido en {currency}",
  spent: "Ya se usó",
  balance: "Sigue en la cuenta",
  executedNote: "{percent} de lo que ya llegó se usó",
  otherCurrency: "También hubo aportes en {currency}",
  unquoted: "Sin cotizar",
  noGoal:
    "El 100 % de la obra todavía no está publicado, así que no mostramos un porcentaje contra una meta.",
  raisedOfGoal: "{percent} de lo que ya llegó se usó",
  ofGoal: "de lo que ya llegó",
  percentOfGoal: "{percent} sigue en la cuenta",
};

/**
 * Cifras públicas: porcentajes sobre totales conocidos, nunca montos (ADR-040).
 *
 * Son tabulares: un número que baila al actualizarse transmite descuido.
 */

/**
 * Una cifra con su etiqueta.
 *
 * La etiqueta es parte del nombre accesible, no un texto suelto al lado.
 */
export function Stat({
  label,
  amount,
  note,
  className,
}: {
  label: string;
  amount: string;
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn("border-t border-rule pt-sm", className)}>
      <dt className="font-ui text-label text-ink-muted">{label}</dt>
      <dd className="mt-2xs font-ui text-figure font-medium" data-figure>
        {amount}
      </dd>
      {note === undefined ? null : (
        <dd className="mt-2xs font-ui text-small text-ink-muted">{note}</dd>
      )}
    </div>
  );
}

/** Contenedor de cifras. `<dl>` real para que la relación etiqueta-valor exista. */
export function StatGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dl className={cn("grid gap-lg sm:grid-cols-2", className)}>{children}</dl>;
}

/**
 * Barra de lo que ya se usó, sobre lo que ya llegó.
 *
 * Cuando no hay recibido, **no se dibuja la barra**: el 100% de la obra no está
 * publicado, y una barra al 0% comunicaría "no juntamos nada".
 */
export function ProgressBar({
  spentPercent,
  remainingPercent,
  locale = "es",
  figures = DEFAULT_FIGURES,
  className,
}: {
  spentPercent: number | null;
  remainingPercent: number | null;
  locale?: Locale;
  figures?: UiContent["figures"];
  className?: string;
}) {
  const intl = intlLocale(locale);

  if (spentPercent === null) {
    return (
      <div className={className}>
        <p className="max-w-measure font-ui text-small text-ink-muted">
          {figures.noGoal}
        </p>
      </div>
    );
  }

  const spentText = formatPercentage(spentPercent, { locale: intl });
  const label = fill(figures.raisedOfGoal, { percent: spentText });

  return (
    <div className={className}>
      <p className="font-ui text-figure font-medium" data-figure>
        {spentText}{" "}
        <span className="text-subheading font-normal text-ink-muted">
          {figures.ofGoal}
        </span>
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(spentPercent)}
        aria-label={label}
        className="mt-md h-2xs w-full overflow-hidden bg-paper-sunk"
      >
        <div
          className="h-full bg-aqua"
          style={{ width: `${String(Math.max(spentPercent, 0.5))}%` }}
        />
      </div>
      {remainingPercent === null ? null : (
        <p className="mt-xs font-ui text-small text-ink-muted" data-figure>
          {fill(figures.percentOfGoal, {
            percent: formatPercentage(remainingPercent, { locale: intl }),
          })}
        </p>
      )}
    </div>
  );
}
