import { publicClaimPortraitResponse } from "./response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  return publicClaimPortraitResponse(id);
}
