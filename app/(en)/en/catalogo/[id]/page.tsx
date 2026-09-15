import {
  CatalogItemScreen,
  catalogItemMetadata,
} from "@/components/screens/catalog-item-screen";

export const revalidate = 300;

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return catalogItemMetadata("en", props);
}

export default function Page(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CatalogItemScreen locale="en" {...props} />;
}
