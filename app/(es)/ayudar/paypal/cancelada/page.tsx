import {
  PaypalReturnScreen,
  paypalReturnMetadata,
} from "@/components/screens/paypal-return-screen";

export const metadata = paypalReturnMetadata("es", "cancelled");

export default function PaypalCanceladaPage() {
  return <PaypalReturnScreen locale="es" kind="cancelled" />;
}
