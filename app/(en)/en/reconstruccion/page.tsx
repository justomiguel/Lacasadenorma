import {
  ReconstructionScreen,
  reconstructionMetadata,
} from "@/components/screens/reconstruction-screen";

export const revalidate = 300;

export const metadata = reconstructionMetadata("en");

export default function ReconstructionPage() {
  return <ReconstructionScreen locale="en" />;
}
