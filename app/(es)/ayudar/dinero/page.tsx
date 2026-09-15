import { DonateScreen, donateMetadata } from "@/components/screens/donate-screen";

export const revalidate = 300;

export const metadata = donateMetadata("es");

export default function DonarDineroPage() {
  return <DonateScreen locale="es" />;
}
