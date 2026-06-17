import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const groupInviteCookieName = "bolao_group_invite";
export const groupInviteCookiePath = "/api/group-invites";
export const groupInviteTokenPattern = /^[A-Za-z0-9_-]{43}$/;

const apiUrl =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export function setGroupInviteCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set({
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60,
    name: groupInviteCookieName,
    path: groupInviteCookiePath,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    value: token,
  });
}

export function clearGroupInviteCookie(response: NextResponse): void {
  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: groupInviteCookieName,
    path: groupInviteCookiePath,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    value: "",
  });
}

function getBackendCookieHeader(request: NextRequest): string {
  return request.cookies
    .getAll()
    .filter(({ name }) => name !== groupInviteCookieName)
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function proxyGroupInviteAction(
  request: NextRequest,
  action: "accept" | "preview",
): Promise<NextResponse> {
  const token = request.cookies.get(groupInviteCookieName)?.value;

  if (!token || !groupInviteTokenPattern.test(token)) {
    return NextResponse.json(
      { message: "Convite indisponível." },
      { status: 404 },
    );
  }

  try {
    const cookie = getBackendCookieHeader(request);
    const upstream = await fetch(`${apiUrl}/v1/group-invites/${action}`, {
      body: JSON.stringify({ token }),
      cache: "no-store",
      headers: {
        ...(cookie ? { cookie } : {}),
        "content-type": "application/json",
      },
      method: "POST",
    });
    const response = new NextResponse(await upstream.text(), {
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
      status: upstream.status,
    });

    if (
      upstream.status === 410 ||
      (action === "accept" && upstream.ok)
    ) {
      clearGroupInviteCookie(response);
    }

    return response;
  } catch {
    return NextResponse.json(
      { message: "Serviço temporariamente indisponível." },
      { status: 503 },
    );
  }
}
