import {
  accountMetadata,
  AccountScreen,
} from "@/components/screens/account/account-screen";

export const metadata = accountMetadata("es");

/**
 * Depende de la sesión, así que no se puede prerrenderizar ni cachear: dos
 * personas distintas tienen que ver cosas distintas en la misma URL.
 */
export const dynamic = "force-dynamic";

export default function CuentaPage() {
  return <AccountScreen locale="es" />;
}
