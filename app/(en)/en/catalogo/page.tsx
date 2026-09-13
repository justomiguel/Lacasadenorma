import { CatalogScreen, catalogMetadata } from "@/components/screens/catalog-screen";

export const revalidate = 300;

export const metadata = catalogMetadata("en");

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const conflicto = params["conflicto"];
  const item = params["item"];

  return (
    <CatalogScreen
      locale="en"
      conflictId={typeof conflicto === "string" ? conflicto : null}
      focusId={typeof item === "string" ? item : null}
    />
  );
}
