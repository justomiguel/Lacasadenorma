import { LegalScreen, legalMetadata } from "@/components/screens/legal-screen";

export const metadata = legalMetadata("es", "privacy");

export default function PrivacidadPage() {
  return <LegalScreen locale="es" kind="privacy" />;
}
