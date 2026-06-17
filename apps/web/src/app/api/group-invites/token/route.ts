import { type NextRequest, NextResponse } from "next/server";
import {
  clearGroupInviteCookie,
  groupInviteTokenPattern,
  setGroupInviteCookie,
} from "@/lib/group-invite-route";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    token?: unknown;
  } | null;
  const token = payload?.token;

  if (typeof token !== "string" || !groupInviteTokenPattern.test(token)) {
    return NextResponse.json(
      { message: "Token inválido." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ stored: true }, { status: 201 });
  setGroupInviteCookie(response, token);
  return response;
}

export async function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  clearGroupInviteCookie(response);
  return response;
}
