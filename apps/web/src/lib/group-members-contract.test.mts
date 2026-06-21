import assert from "node:assert/strict";
import test from "node:test";

const contractUrl = new URL(
  "./group-members-contract.ts",
  import.meta.url,
).href;
const {
  buildGroupMemberRolePath,
  createGroupMemberRoleUpdateBody,
  getNextManageableGroupRole,
  isManageableGroupRole,
} = (await import(contractUrl)) as typeof import("./group-members-contract");

test("builds the fixed member role endpoint", () => {
  assert.equal(
    buildGroupMemberRolePath("group-1", "membership-2"),
    "/v1/groups/group-1/members/membership-2/role",
  );
  assert.equal(
    buildGroupMemberRolePath("group/1", "member 2"),
    "/v1/groups/group%2F1/members/member%202/role",
  );
});

test("builds the fixed member role body", () => {
  assert.deepEqual(createGroupMemberRoleUpdateBody("ORGANIZER"), {
    role: "ORGANIZER",
  });
  assert.deepEqual(createGroupMemberRoleUpdateBody("MEMBER"), {
    role: "MEMBER",
  });
});

test("allows only member and organizer roles to be changed by the UI", () => {
  assert.equal(isManageableGroupRole("MEMBER"), true);
  assert.equal(isManageableGroupRole("ORGANIZER"), true);
  assert.equal(isManageableGroupRole("OWNER"), false);
});

test("toggles manageable member roles", () => {
  assert.equal(getNextManageableGroupRole("MEMBER"), "ORGANIZER");
  assert.equal(getNextManageableGroupRole("ORGANIZER"), "MEMBER");
});
