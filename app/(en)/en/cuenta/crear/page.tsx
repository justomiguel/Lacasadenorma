import {
  signUpMetadata,
  SignUpScreen,
} from "@/components/screens/account/credential-screens";

export const metadata = signUpMetadata("en");

export default function CreateAccountPage() {
  return <SignUpScreen locale="en" />;
}
