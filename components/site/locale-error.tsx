"use client";

import { ErrorScreen } from "@/components/site/error-screen";
import { useUi } from "@/components/i18n/ui-provider";
import { localizedHref } from "@/src/i18n/href";

export function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { locale, ui } = useUi();

  return (
    <ErrorScreen
      error={error}
      retry={retry}
      copy={ui.errorPage}
      homeHref={localizedHref("/", locale)}
    />
  );
}
