import { LegalScreen, legalMetadata } from "@/components/screens/legal-screen";

export const metadata = legalMetadata("en", "privacy");

export default function PrivacyPage() {
  return <LegalScreen locale="en" kind="privacy" />;
}
