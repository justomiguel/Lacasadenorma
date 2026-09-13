import { HelpScreen, helpMetadata } from "@/components/screens/help-screen";

export const revalidate = 300;

export const metadata = helpMetadata("es");

export default async function AyudarPage() {
  return <HelpScreen locale="es" />;
}
