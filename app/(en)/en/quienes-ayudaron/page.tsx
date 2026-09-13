import { WallScreen, wallMetadata } from "@/components/screens/wall-screen";

export const revalidate = 300;

export const metadata = wallMetadata("en");

export default function WhoHelpedPage() {
  return <WallScreen locale="en" />;
}
