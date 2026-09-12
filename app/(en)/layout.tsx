import type { Viewport } from "next";

import { PublicDocument } from "@/components/site/public-document";
import { rootMetadata } from "@/src/infrastructure/seo/metadata";

export const metadata = rootMetadata("en");

export const viewport: Viewport = {
  themeColor: "#153A2E",
  colorScheme: "light",
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <PublicDocument locale="en">{children}</PublicDocument>;
}
