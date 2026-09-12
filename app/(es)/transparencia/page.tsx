import {
  TransparencyScreen,
  transparencyMetadata,
} from "@/components/screens/transparency-screen";

export const revalidate = 300;

export const metadata = transparencyMetadata("es");

export default function TransparenciaPage() {
  return <TransparencyScreen locale="es" />;
}
