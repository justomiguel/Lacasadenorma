import { cookies } from "next/headers";

import {
  signUpMetadata,
  SignUpScreen,
} from "@/components/screens/account/credential-screens";
import {
  DONATE_INTENT_COOKIE,
  parseDonateIntent,
} from "@/src/application/accounts/donate-intent";

export const metadata = signUpMetadata("es");

export default async function CrearCuentaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const volver = params["volver"];
  const intent = parseDonateIntent((await cookies()).get(DONATE_INTENT_COOKIE)?.value);

  return (
    <SignUpScreen
      locale="es"
      returnTo={typeof volver === "string" ? volver : null}
      donateIntent={intent}
    />
  );
}
