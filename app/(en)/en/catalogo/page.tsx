import { CatalogScreen, catalogMetadata } from "@/components/screens/catalog-screen";
import { redirect } from "next/navigation";

export const revalidate = 300;

export const metadata = catalogMetadata("en");

const ITEM_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const conflicto = params["conflicto"];
  const item = params["item"];

  if (typeof item === "string" && ITEM_ID.test(item)) {
    redirect(`/en/catalogo/${item.toLowerCase()}`);
  }

  return (
    <CatalogScreen
      locale="en"
      conflictId={typeof conflicto === "string" ? conflicto : null}
    />
  );
}
