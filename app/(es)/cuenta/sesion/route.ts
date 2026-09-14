import { accountSessionResponse } from "./response";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return accountSessionResponse();
}
