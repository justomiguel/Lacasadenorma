import {
  TransparencyScreen,
  transparencyMetadata,
} from "@/components/screens/transparency-screen";

export const revalidate = 300;

export const metadata = transparencyMetadata("en");

export default function TransparencyPage() {
  return <TransparencyScreen locale="en" />;
}
