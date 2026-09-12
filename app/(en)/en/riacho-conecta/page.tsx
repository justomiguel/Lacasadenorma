import { RiachoScreen, riachoMetadata } from "@/components/screens/riacho-screen";

export const metadata = riachoMetadata("en");

export default function RiachoPage() {
  return <RiachoScreen locale="en" />;
}
