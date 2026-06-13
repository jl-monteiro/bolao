import "server-only";

import { headers } from "next/headers";

const apiUrl =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export type GroupRole = "OWNER" | "ORGANIZER" | "MEMBER";

export type GroupSummary = {
  createdAt: string;
  description: string | null;
  id: string;
  image: string | null;
  name: string;
  role: GroupRole;
  updatedAt: string;
};

export async function getGroups(): Promise<GroupSummary[]> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  const response = await fetch(`${apiUrl}/v1/groups`, {
    cache: "no-store",
    headers: cookie
      ? {
          cookie,
        }
      : undefined,
  });

  if (!response.ok) {
    throw new Error(`Failed to load groups: ${response.status}`);
  }

  return (await response.json()) as GroupSummary[];
}
