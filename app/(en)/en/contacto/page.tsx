import { ContactScreen, contactMetadata } from "@/components/screens/contact-screen";

export const metadata = contactMetadata("en");

export default function ContactPage() {
  return <ContactScreen locale="en" />;
}
