import {
  PaypalReturnScreen,
  paypalReturnMetadata,
} from "@/components/screens/paypal-return-screen";

export const metadata = paypalReturnMetadata("en", "cancelled");

export default function PaypalCancelledPage() {
  return <PaypalReturnScreen locale="en" kind="cancelled" />;
}
