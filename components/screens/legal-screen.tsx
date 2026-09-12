import { LegalDocument } from "@/components/site/legal-document";
import { getContent } from "@/content";
import type { Locale } from "@/src/i18n/locale";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export type LegalKind = "privacy" | "terms";

export function legalMetadata(locale: Locale, kind: LegalKind) {
  const { legal, ui } = getContent(locale);
  const document = kind === "privacy" ? legal.privacy : legal.terms;

  return pageMetadata({
    locale,
    title: document.title,
    description: kind === "privacy" ? ui.legalPage.privacySeo : ui.legalPage.termsSeo,
    path: kind === "privacy" ? "/legales/privacidad" : "/legales/terminos",
  });
}

export function LegalScreen({ locale, kind }: { locale: Locale; kind: LegalKind }) {
  const { legal, ui } = getContent(locale);
  const document = kind === "privacy" ? legal.privacy : legal.terms;

  return (
    <LegalDocument
      document={document}
      updatedOn={legal.updatedOn}
      locale={locale}
      legalLabel={ui.legalLabel}
      lastUpdatedLabel={ui.lastUpdated}
    />
  );
}
