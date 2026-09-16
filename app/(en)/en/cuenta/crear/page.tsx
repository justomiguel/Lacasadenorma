import {
  signUpMetadata,
  SignUpScreen,
} from "@/components/screens/account/credential-screens";

export const metadata = signUpMetadata("en");

export default async function CreateAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const volver = params["volver"];

  return (
    <SignUpScreen locale="en" returnTo={typeof volver === "string" ? volver : null} />
  );
}
