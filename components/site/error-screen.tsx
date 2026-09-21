"use client";

import { useEffect, useState } from "react";

import { primaryActionClass, SecondaryAction } from "@/components/design-system/actions";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import { RefreshIcon } from "@/components/design-system/icons";
import { Container, Section } from "@/components/design-system/layout";
import { PageHeader } from "@/components/site/page-header";
import {
  formatErrorDiagnostic,
  type ErrorDiagnostic,
} from "@/src/infrastructure/logging/error-diagnostic";

export interface ErrorPageCopy {
  readonly title: string;
  readonly lead: string;
  readonly retry: string;
  readonly home: string;
  readonly stackLabel: string;
  readonly close: string;
}

/**
 * Estado de error diseñado (principio XII, ADR-053). El stack sólo se pide
 * a `/api/diagnostico` —en producción responde si `SHOW_ERROR_STACK=1`.
 */
export function ErrorScreen({
  error,
  retry,
  copy,
  homeHref,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  copy: ErrorPageCopy;
  homeHref: string;
}) {
  const [detail, setDetail] = useState<string | null>(
    typeof error.stack === "string" && error.stack.length > 0 ? error.stack : null,
  );

  useEffect(() => {
    const digest = error.digest;

    if (digest === undefined || digest.length === 0) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/diagnostico?digest=${encodeURIComponent(digest)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (cancelled || body === null || typeof body !== "object") {
          return;
        }

        setDetail(formatErrorDiagnostic(body as ErrorDiagnostic));
      })
      .catch(() => {
        // Sin toggle o sin instancia: queda el mensaje diseñado.
      });

    return () => {
      cancelled = true;
    };
  }, [error.digest]);

  return (
    <>
      <PageHeader mark title={copy.title} lead={copy.lead} />
      <Container>
        <Section tight>
          <div className="flex flex-col items-start gap-md sm:flex-row sm:items-center">
            <button
              type="button"
              className={primaryActionClass()}
              onClick={() => retry()}
            >
              <IdentifyingMark>
                <RefreshIcon />
              </IdentifyingMark>
              {copy.retry}
            </button>
            <SecondaryAction href={homeHref}>{copy.home}</SecondaryAction>
          </div>
          {detail === null ? null : (
            <div className="mt-xl">
              <p className="font-ui text-small text-olive">{copy.stackLabel}</p>
              <pre className="mt-sm max-h-96 overflow-auto bg-paper-sunk p-md font-ui text-small text-ink whitespace-pre-wrap">
                {detail}
              </pre>
            </div>
          )}
        </Section>
      </Container>
    </>
  );
}
