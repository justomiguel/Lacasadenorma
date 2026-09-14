import { isTrustedAvatarUrl } from "@/src/domain/auth/social-profile";

import { UnsupportedFileError } from "./image";
import { inspectPortrait } from "./portrait";

const FETCH_MS = 5_000;

/**
 * Baja un retrato de la red, si la URL es de un CDN que conocemos.
 *
 * No se sigue un redirect: un 302 a una IP interna convertiría la lista blanca
 * de anfitriones en teatro. Si el archivo no es una foto aceptable, no hay
 * retrato: entrar no puede depender de esto.
 */
export async function downloadTrustedPortrait(
  url: string,
  get: (url: string, init?: RequestInit) => Promise<Response> = fetch,
): Promise<File | null> {
  if (!isTrustedAvatarUrl(url)) {
    return null;
  }

  let response: Response;

  try {
    response = await get(url, {
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_MS),
      headers: { Accept: "image/*" },
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const file = new File([bytes], "retrato", {
    type: response.headers.get("content-type") ?? "application/octet-stream",
  });

  try {
    const info = await inspectPortrait(file);

    return new File([bytes], `retrato.${extensionOf(info.mimeType)}`, {
      type: info.mimeType,
    });
  } catch (error) {
    if (error instanceof UnsupportedFileError) {
      return null;
    }

    throw error;
  }
}

function extensionOf(mimeType: string): string {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}
