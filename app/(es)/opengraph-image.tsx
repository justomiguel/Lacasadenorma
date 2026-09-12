import {
  contentType,
  openGraphAlt,
  renderOpenGraphImage,
  size,
} from "@/src/infrastructure/seo/opengraph-card";

export const alt = openGraphAlt("es");
export { size, contentType };

export default function OpenGraphImage() {
  return renderOpenGraphImage("es");
}
