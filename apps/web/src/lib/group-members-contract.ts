export type GroupRole = "OWNER" | "ORGANIZER" | "MEMBER";

export type ManageableGroupRole = Exclude<GroupRole, "OWNER">;

export type GroupMember = {
  id: string;
  image: string | null;
  joinedAt: string;
  name: string;
  role: GroupRole;
};

export type GroupMemberRoleUpdateBody = {
  role: ManageableGroupRole;
};

const manageableGroupRoles = new Set<GroupRole>(["ORGANIZER", "MEMBER"]);

export function isManageableGroupRole(
  role: GroupRole,
): role is ManageableGroupRole {
  return manageableGroupRoles.has(role);
}

export function getNextManageableGroupRole(
  role: ManageableGroupRole,
): ManageableGroupRole {
  return role === "MEMBER" ? "ORGANIZER" : "MEMBER";
}

export function createGroupMemberRoleUpdateBody(
  role: ManageableGroupRole,
): GroupMemberRoleUpdateBody {
  return { role };
}

export function buildGroupMemberRolePath(
  groupId: string,
  membershipId: string,
): string {
  return `/v1/groups/${encodeURIComponent(
    groupId,
  )}/members/${encodeURIComponent(membershipId)}/role`;
}
