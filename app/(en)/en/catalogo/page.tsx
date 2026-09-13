import { CatalogScreen, catalogMetadata } from "@/components/screens/catalog-screen";

export const revalidate = 300;

export const metadata = catalogMetadata("en");

export default function CatalogPage() {
  return <CatalogScreen locale="en" />;
}
