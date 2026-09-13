import { HelpScreen, helpMetadata } from "@/components/screens/help-screen";

export const revalidate = 300;

export const metadata = helpMetadata("en");

export default async function HelpPage() {
  return <HelpScreen locale="en" />;
}
