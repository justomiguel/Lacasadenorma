import {
  generateNewsMetadata,
  NewsArticleScreen,
} from "@/components/screens/news-article-screen";

export const revalidate = 300;

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  return generateNewsMetadata("es", props);
}

export default function Page(props: { params: Promise<{ slug: string }> }) {
  return <NewsArticleScreen locale="es" {...props} />;
}
