import { readOwnChrome } from "@/src/application/accounts/own-portrait";
import { readViewer } from "@/src/infrastructure/auth/viewer";
import { getAccountDeps } from "@/src/infrastructure/accounts/context";

export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json",
};

/**
 * Snapshot privado del chrome. No crea el perfil: abrir el menú no es pedir una
 * cuenta (ADR-037).
 */
export async function accountSessionResponse(): Promise<Response> {
  const viewer = await readViewer();

  if (viewer === null) {
    return Response.json({ status: "anonymous" }, { headers: HEADERS });
  }

  const chrome = await readOwnChrome(await getAccountDeps());

  if (chrome.status === "error") {
    return Response.json(
      {
        status: "signed-in",
        displayName: null,
        email: viewer.email,
        hasPortrait: false,
      },
      { headers: HEADERS },
    );
  }

  return Response.json(
    {
      status: "signed-in",
      displayName: chrome.value.displayName,
      email: viewer.email,
      hasPortrait: chrome.value.hasPortrait,
    },
    { headers: HEADERS },
  );
}
