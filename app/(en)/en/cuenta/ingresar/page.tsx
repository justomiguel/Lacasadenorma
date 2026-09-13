import {
  signInMetadata,
  SignInScreen,
} from "@/components/screens/account/credential-screens";

export const metadata = signInMetadata("en");

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const aviso = params["aviso"];

  return <SignInScreen locale="en" notice={typeof aviso === "string" ? aviso : null} />;
}
