import { LegalScreen, legalMetadata } from "@/components/screens/legal-screen";

export const metadata = legalMetadata("es", "terms");

export default function TerminosPage() {
  return <LegalScreen locale="es" kind="terms" />;
}
