import {
  WhatHappenedScreen,
  whatHappenedMetadata,
} from "@/components/screens/what-happened-screen";

export const metadata = whatHappenedMetadata("es");

export default function QuePasoPage() {
  return <WhatHappenedScreen locale="es" />;
}
