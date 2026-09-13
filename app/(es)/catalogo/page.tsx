import { CatalogScreen, catalogMetadata } from "@/components/screens/catalog-screen";

export const revalidate = 300;

export const metadata = catalogMetadata("es");

export default function CatalogoPage() {
  return <CatalogScreen locale="es" />;
}
