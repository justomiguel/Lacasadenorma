import type { NextRequest, NextResponse } from "next/server";

import { confirmEmailLink } from "@/app/(es)/cuenta/confirmar/confirm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return confirmEmailLink(request, "en");
}
