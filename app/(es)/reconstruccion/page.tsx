import {
  ReconstructionScreen,
  reconstructionMetadata,
} from "@/components/screens/reconstruction-screen";

export const revalidate = 300;

export const metadata = reconstructionMetadata("es");

export default function ReconstruccionPage() {
  return <ReconstructionScreen locale="es" />;
}
