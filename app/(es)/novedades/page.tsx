import {
  NewsIndexScreen,
  newsIndexMetadata,
} from "@/components/screens/news-index-screen";

export const revalidate = 300;

export const metadata = newsIndexMetadata("es");

export default function NovedadesPage() {
  return <NewsIndexScreen locale="es" />;
}
