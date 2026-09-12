import {
  WhatHappenedScreen,
  whatHappenedMetadata,
} from "@/components/screens/what-happened-screen";

export const metadata = whatHappenedMetadata("en");

export default function WhatHappenedPage() {
  return <WhatHappenedScreen locale="en" />;
}
