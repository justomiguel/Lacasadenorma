import Link from "next/link";

import { Callout, type CalloutTone } from "@/components/design-system/callout";
import type { MetricSignal } from "@/src/domain/metrics";

const TONE: Record<MetricSignal["severity"], CalloutTone> = {
  danger: "danger",
  warning: "warning",
  info: "neutral",
};

const SEVERITY_WORD: Record<MetricSignal["severity"], string> = {
  danger: "Urgente",
  warning: "Atención",
  info: "Aviso",
};

/**
 * Las excepciones primero. Cada una enlaza a la pantalla donde se actúa.
 */
export function MetricsSignalList({
  signals,
  empty,
}: {
  signals: readonly MetricSignal[];
  empty?: string;
}) {
  if (signals.length === 0) {
    return empty === undefined ? null : (
      <p className="max-w-measure font-ui text-small text-ink-muted">{empty}</p>
    );
  }

  return (
    <ul className="grid gap-md">
      {signals.map((signal) => (
        <li key={signal.id}>
          <Callout
            tone={TONE[signal.severity]}
            title={`${SEVERITY_WORD[signal.severity]} · ${signal.title}`}
          >
            <p>
              {signal.body}{" "}
              <Link href={signal.href} className="text-aqua underline underline-offset-2">
                Ir
              </Link>
              {signal.count > 1 ? ` · ${String(signal.count)}` : null}
            </p>
          </Callout>
        </li>
      ))}
    </ul>
  );
}
