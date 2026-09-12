import { formatAmount, formatMoney, type Money } from "@/src/domain/money";
import { formatPercentage } from "@/src/domain/percentage";
import type { UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { intlLocale, type Locale } from "@/src/i18n/locale";

import { cn } from "./cn";

const DEFAULT_FIGURES: UiContent["figures"] = {
  received: "Recibido",
  receivedIn: "Recibido en {currency}",
  spent: "Gastado",
  balance: "Saldo",
  executedNote: "{percent} del objetivo ya ejecutado",
  otherCurrency: "Recibido en otra moneda ({currency})",
  unquoted: "Sin cotizar",
  noGoal:
    "recaudado. El objetivo todavía no está publicado, así que no mostramos un porcentaje.",
  raisedOfGoal: "{raised} recaudados de un objetivo de {goal}",
  ofGoal: "de {goal}",
  percentOfGoal: "{percent} del objetivo",
};

/**
 * Cifras y barras de progreso.
 *
 * Todas las cifras son tabulares: un monto que baila al actualizarse transmite
 * descuido, y acá los números son el argumento.
 */

/**
 * Una cifra con su etiqueta y su fecha.
 *
 * La etiqueta es parte del nombre accesible de la cifra, no un texto suelto al
 * lado: quien usa un lector de pantalla escucha "Recibido, 1.240.000 pesos", no
 * un número sin contexto.
 */
export function Stat({
  label,
  amount,
  note,
  locale = "es",
  className,
}: {
  label: string;
  amount: Money | string;
  note?: string;
  locale?: Locale;
  className?: string;
}) {
  const value =
    typeof amount === "string" ? amount : formatMoney(amount, intlLocale(locale));

  return (
    <div className={cn("border-t border-rule pt-sm", className)}>
      <dt className="font-ui text-label text-ink-muted">{label}</dt>
      <dd className="mt-2xs font-ui text-figure font-medium" data-figure>
        {value}
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
  return <dl className={cn("grid gap-lg sm:grid-cols-3", className)}>{children}</dl>;
}

/**
 * Barra de progreso de la recaudación.
 *
 * Cuando no hay objetivo cargado, **no se dibuja la barra**: se muestra lo
 * recaudado. Una barra al 0% comunica "no juntamos nada", que es distinto de "no
 * publicamos el objetivo todavía" (FR de honestidad del contenido).
 */
export function ProgressBar({
  raised,
  goal,
  percent,
  locale = "es",
  figures = DEFAULT_FIGURES,
  className,
}: {
  raised: Money;
  goal: Money | null;
  percent: number | null;
  locale?: Locale;
  figures?: UiContent["figures"];
  className?: string;
}) {
  const intl = intlLocale(locale);
  const raisedText = formatMoney(raised, intl);

  if (goal === null || percent === null) {
    return (
      <div className={className}>
        <p className="font-ui text-figure font-medium" data-figure>
          {raisedText}
        </p>
        <p className="mt-xs max-w-measure font-ui text-small text-ink-muted">
          {figures.noGoal}
        </p>
      </div>
    );
  }

  const goalText = formatMoney(goal, intl);
  const label = fill(figures.raisedOfGoal, { raised: raisedText, goal: goalText });

  return (
    <div className={className}>
      <p className="font-ui text-figure font-medium" data-figure>
        {raisedText}{" "}
        <span className="text-subheading font-normal text-ink-muted">
          {fill(figures.ofGoal, { goal: goalText })}
        </span>
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={label}
        className="mt-md h-2xs w-full overflow-hidden bg-paper-sunk"
      >
        <div
          className="h-full bg-aqua"
          style={{ width: `${String(Math.max(percent, 0.5))}%` }}
        />
      </div>
      <p className="mt-xs font-ui text-small text-ink-muted" data-figure>
        {fill(figures.percentOfGoal, {
          percent: formatPercentage(percent, { locale: intl }),
        })}
      </p>
    </div>
  );
}

/** Monto dentro de una tabla, sin símbolo: la moneda está en el encabezado. */
export function TableAmount({
  amount,
  locale = "es",
}: {
  amount: Money;
  locale?: Locale;
}) {
  return (
    <span className="font-ui tabular-nums" data-figure>
      {formatAmount(amount, intlLocale(locale))}
    </span>
  );
}
