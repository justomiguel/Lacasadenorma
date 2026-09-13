import {
  recoverMetadata,
  RecoverScreen,
} from "@/components/screens/account/recovery-screens";

export const metadata = recoverMetadata("en");

export default function RecoverPage() {
  return <RecoverScreen locale="en" />;
}
