import {
  signUpMetadata,
  SignUpScreen,
} from "@/components/screens/account/credential-screens";

export const metadata = signUpMetadata("es");

export default async function CrearCuentaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const volver = params["volver"];

  return (
    <SignUpScreen locale="es" returnTo={typeof volver === "string" ? volver : null} />
  );
}
