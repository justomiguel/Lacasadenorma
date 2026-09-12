import { ContactScreen, contactMetadata } from "@/components/screens/contact-screen";

export const metadata = contactMetadata("es");

export default function ContactoPage() {
  return <ContactScreen locale="es" />;
}
