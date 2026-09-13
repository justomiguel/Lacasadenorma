import {
  PaypalReturnScreen,
  paypalReturnMetadata,
} from "@/components/screens/paypal-return-screen";

export const metadata = paypalReturnMetadata("en", "completed");

export default function PaypalCompletedPage() {
  return <PaypalReturnScreen locale="en" kind="completed" />;
}
