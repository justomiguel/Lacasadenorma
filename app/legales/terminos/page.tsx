import { LegalDocument } from "@/components/site/legal-document";
import { legal } from "@/content";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const metadata = pageMetadata({
  title: legal.terms.title,
  description:
    "Qué es este sitio, quién lo sostiene, cómo se usan los aportes y qué pasa si la campaña no llega al objetivo.",
  path: "/legales/terminos",
});

export default function TerminosPage() {
  return <LegalDocument document={legal.terms} updatedOn={legal.updatedOn} />;
}
