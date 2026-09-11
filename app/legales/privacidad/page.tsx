import { LegalDocument } from "@/components/site/legal-document";
import { legal } from "@/content";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const metadata = pageMetadata({
  title: legal.privacy.title,
  description:
    "Este sitio no pide datos, no usa cookies de terceros y no te sigue por otras páginas. Qué se mide, para qué y cuánto se conserva.",
  path: "/legales/privacidad",
});

export default function PrivacidadPage() {
  return <LegalDocument document={legal.privacy} updatedOn={legal.updatedOn} />;
}
