import { LegalScreen, legalMetadata } from "@/components/screens/legal-screen";

export const metadata = legalMetadata("en", "terms");

export default function TermsPage() {
  return <LegalScreen locale="en" kind="terms" />;
}
