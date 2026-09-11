import {
  MILESTONE_STATUS_LABELS,
  type MilestoneRecord,
  type MilestoneStatus,
} from "@/src/domain/entities";

import { cn } from "./cn";
import { formatLongDate } from "./dates";

/**
 * Hitos de la obra.
 *
 * Es una lista ordenada real, no una pila de divs: el avance de una obra tiene
 * orden, y un lector de pantalla debería anunciar "3 de 7".
 *
 * El estado se comunica por palabra y por forma del marcador, no sólo por color.
 */

const STATUS_MARKER: Record<MilestoneStatus, string> = {
  completado: "bg-success",
  en_curso: "border-2 border-brick bg-paper",
  pendiente: "border border-rule bg-paper",
};

export function Timeline({
  milestones,
  className,
}: {
  milestones: readonly MilestoneRecord[];
  className?: string;
}) {
  return (
    <ol className={cn("space-y-lg", className)}>
      {milestones.map((milestone) => (
        <li key={milestone.id} className="grid grid-cols-[auto_1fr] gap-md">
          <span
            aria-hidden="true"
            className={cn("mt-xs size-sm rounded-sm", STATUS_MARKER[milestone.status])}
          />
          <div>
            <p className="font-ui text-subheading font-medium">{milestone.title}</p>
            <p className="mt-3xs font-ui text-small text-ink-muted">
              {MILESTONE_STATUS_LABELS[milestone.status]}
              {milestone.happenedOn === null ? null : (
                <>
                  {" · "}
                  <time dateTime={milestone.happenedOn}>
                    {formatLongDate(milestone.happenedOn)}
                  </time>
                </>
              )}
            </p>
            {milestone.description === null ? null : (
              <p className="mt-xs max-w-measure text-body text-ink-muted">
                {milestone.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
