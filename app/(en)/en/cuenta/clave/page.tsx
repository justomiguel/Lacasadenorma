import {
  passwordMetadata,
  PasswordScreen,
} from "@/components/screens/account/recovery-screens";

export const metadata = passwordMetadata("en");

/**
 * Depende de la sesión que creó el enlace del correo, así que no se puede
 * prerrenderizar: una versión estática serviría el estado «este enlace no sirve»
 * a quien acaba de abrir uno que sí sirve.
 */
export const dynamic = "force-dynamic";

export default function PasswordPage() {
  return <PasswordScreen locale="en" />;
}
