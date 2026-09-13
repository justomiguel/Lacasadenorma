import {
  signInMetadata,
  SignInScreen,
} from "@/components/screens/account/credential-screens";

export const metadata = signInMetadata("es");

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const aviso = params["aviso"];

  return <SignInScreen locale="es" notice={typeof aviso === "string" ? aviso : null} />;
}
