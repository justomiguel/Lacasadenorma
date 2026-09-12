import { LegacyScreen, legacyMetadata } from "@/components/screens/legacy-screen";

export const metadata = legacyMetadata("en");

export default function LegacyPage() {
  return <LegacyScreen locale="en" />;
}
