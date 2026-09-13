import type { NextRequest, NextResponse } from "next/server";

import { confirmEmailLink } from "./confirm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return confirmEmailLink(request, "es");
}
