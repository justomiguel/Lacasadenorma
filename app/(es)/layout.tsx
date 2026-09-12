import type { Viewport } from "next";

import { PublicDocument } from "@/components/site/public-document";
import { rootMetadata } from "@/src/infrastructure/seo/metadata";

export const metadata = rootMetadata("es");

export const viewport: Viewport = {
  themeColor: "#fbf9f5",
  colorScheme: "light",
};

export default function EsLayout({ children }: { children: React.ReactNode }) {
  return <PublicDocument locale="es">{children}</PublicDocument>;
}
