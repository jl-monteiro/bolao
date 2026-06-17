import type { NextRequest } from "next/server";
import { proxyGroupInviteAction } from "@/lib/group-invite-route";

export function POST(request: NextRequest) {
  return proxyGroupInviteAction(request, "preview");
}
