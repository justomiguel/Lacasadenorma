import { HomeScreen } from "@/components/screens/home-screen";

export const revalidate = 300;

export default function HomePage() {
  return <HomeScreen locale="en" />;
}
