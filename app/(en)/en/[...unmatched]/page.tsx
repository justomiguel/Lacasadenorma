import { notFound } from "next/navigation";

/**
 * 404 de una URL bajo `/en` que no calza ninguna página.
 *
 * El catch-all hace que la ruta entre al root layout inglés y dispare
 * `not-found.tsx`. Sin esto, `/en/lo-que-sea` cae en el 404 global, que es
 * castellano. No va un catch-all equivalente en la raíz: haría `/${string}`
 * una ruta tipada y apagaría `typedRoutes`.
 */
export default function UnmatchedEnPage(_props: {
  params: Promise<{ unmatched: string[] }>;
}): never {
  notFound();
}
