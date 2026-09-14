import { accountSessionResponse } from "@/app/(es)/cuenta/sesion/response";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return accountSessionResponse();
}
