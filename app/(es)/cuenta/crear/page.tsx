import {
  signUpMetadata,
  SignUpScreen,
} from "@/components/screens/account/credential-screens";

export const metadata = signUpMetadata("es");

export default function CrearCuentaPage() {
  return <SignUpScreen locale="es" />;
}
