import {
  contentType,
  openGraphAlt,
  renderOpenGraphImage,
  size,
} from "@/src/infrastructure/seo/opengraph-card";

export const alt = openGraphAlt("en");
export { size, contentType };

export default function OpenGraphImage() {
  return renderOpenGraphImage("en");
}
