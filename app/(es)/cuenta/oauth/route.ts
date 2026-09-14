import type { NextRequest, NextResponse } from "next/server";

import { completeOAuth } from "./callback";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return completeOAuth(request, "es");
}
