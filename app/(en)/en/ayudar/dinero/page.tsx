import { DonateScreen, donateMetadata } from "@/components/screens/donate-screen";

export const revalidate = 300;

export const metadata = donateMetadata("en");

export default function DonateMoneyPage() {
  return <DonateScreen locale="en" />;
}
