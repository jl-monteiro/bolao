import "server-only";

import { headers } from "next/headers";
import type {
  GroupInvite,
  GroupPendingMember,
  IncomingGroupInvite,
  MePendingMembership,
} from "@/lib/group-invites-contract";

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

export type GroupMember = {
  id: string;
  image: string | null;
  joinedAt: string;
  name: string;
  role: GroupRole;
};

export class GroupNotFoundError extends Error {
  constructor() {
    super("Grupo não encontrado.");
    this.name = "GroupNotFoundError";
  }
}

async function getCookieHeader() {
  const requestHeaders = await headers();
  return requestHeaders.get("cookie");
}

async function getProtectedResource<T>(path: string): Promise<T> {
  const cookie = await getCookieHeader();
  const response = await fetch(`${apiUrl}${path}`, {
    cache: "no-store",
    headers: cookie
      ? {
          cookie,
        }
      : undefined,
  });

  if (response.status === 404) {
    throw new GroupNotFoundError();
  }

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function isGroupNotFoundError(
  error: unknown,
): error is GroupNotFoundError {
  return error instanceof GroupNotFoundError;
}

export function getGroups(): Promise<GroupSummary[]> {
  return getProtectedResource<GroupSummary[]>("/v1/groups");
}

export function getGroup(groupId: string): Promise<GroupSummary> {
  return getProtectedResource<GroupSummary>(`/v1/groups/${groupId}`);
}

export function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  return getProtectedResource<GroupMember[]>(
    `/v1/groups/${groupId}/members`,
  );
}

export function getGroupInvites(groupId: string): Promise<GroupInvite[]> {
  return getProtectedResource<GroupInvite[]>(
    `/v1/groups/${groupId}/invites`,
  );
}

export function getGroupPendingMembers(
  groupId: string,
): Promise<GroupPendingMember[]> {
  return getProtectedResource<GroupPendingMember[]>(
    `/v1/groups/${groupId}/pending-members`,
  );
}

export function getMyIncomingInvites(): Promise<IncomingGroupInvite[]> {
  return getProtectedResource<IncomingGroupInvite[]>(
    "/v1/me/incoming-invites",
  );
}

export function getMyPendingMemberships(): Promise<MePendingMembership[]> {
  return getProtectedResource<MePendingMembership[]>(
    "/v1/me/pending-memberships",
  );
}
