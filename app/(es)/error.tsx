"use client";

import { LocaleError } from "@/components/site/locale-error";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <LocaleError error={error} retry={retry} />;
}
