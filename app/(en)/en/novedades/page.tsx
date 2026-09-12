import {
  NewsIndexScreen,
  newsIndexMetadata,
} from "@/components/screens/news-index-screen";

export const revalidate = 300;

export const metadata = newsIndexMetadata("en");

export default function NewsIndexPage() {
  return <NewsIndexScreen locale="en" />;
}
