import {
  PaypalReturnScreen,
  paypalReturnMetadata,
} from "@/components/screens/paypal-return-screen";

export const metadata = paypalReturnMetadata("es", "completed");

export default function PaypalCompletadaPage() {
  return <PaypalReturnScreen locale="es" kind="completed" />;
}
