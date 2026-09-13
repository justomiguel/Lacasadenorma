import { WallScreen, wallMetadata } from "@/components/screens/wall-screen";

export const revalidate = 300;

export const metadata = wallMetadata("es");

export default function QuienesAyudaronPage() {
  return <WallScreen locale="es" />;
}
