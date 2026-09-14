import type { NextRequest, NextResponse } from "next/server";

import { completeOAuth } from "@/app/(es)/cuenta/oauth/callback";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return completeOAuth(request, "en");
}
