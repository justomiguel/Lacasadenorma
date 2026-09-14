import { ownPortraitResponse } from "@/app/(es)/cuenta/retrato/response";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return ownPortraitResponse();
}
