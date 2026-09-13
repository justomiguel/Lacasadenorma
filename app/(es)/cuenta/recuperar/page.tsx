import {
  recoverMetadata,
  RecoverScreen,
} from "@/components/screens/account/recovery-screens";

export const metadata = recoverMetadata("es");

export default function RecuperarPage() {
  return <RecoverScreen locale="es" />;
}
