import {
  accountMetadata,
  AccountScreen,
} from "@/components/screens/account/account-screen";

export const metadata = accountMetadata("en");

/**
 * Depende de la sesión, así que no se puede prerrenderizar ni cachear: dos
 * personas distintas tienen que ver cosas distintas en la misma URL.
 */
export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const aviso = params["aviso"];
  const seccion = params["seccion"];

  return (
    <AccountScreen
      locale="en"
      notice={typeof aviso === "string" ? aviso : null}
      section={typeof seccion === "string" ? seccion : null}
    />
  );
}
