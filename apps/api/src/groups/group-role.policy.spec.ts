import { ForbiddenException } from "@nestjs/common";
import { GroupRole } from "../generated/prisma/enums.js";
import { GroupRolePolicy } from "./group-role.policy.js";

describe("GroupRolePolicy", () => {
  const policy = new GroupRolePolicy();

  it("allows the Group Owner to update Group details", () => {
    expect(() => policy.assertCanUpdate(GroupRole.OWNER)).not.toThrow();
  });

  it("allows an Organizer to update Group details", () => {
    expect(() =>
      policy.assertCanUpdate(GroupRole.ORGANIZER),
    ).not.toThrow();
  });

  it("forbids a Member from updating Group details", () => {
    expect(() => policy.assertCanUpdate(GroupRole.MEMBER)).toThrow(
      new ForbiddenException("Você não pode editar este Grupo."),
    );
  });

  it("allows the Group Owner to manage invitations", () => {
    expect(() =>
      policy.assertCanManageInvites(GroupRole.OWNER),
    ).not.toThrow();
  });

  it("allows an Organizer to manage invitations", () => {
    expect(() =>
      policy.assertCanManageInvites(GroupRole.ORGANIZER),
    ).not.toThrow();
  });

  it("forbids a Member from managing invitations", () => {
    expect(() =>
      policy.assertCanManageInvites(GroupRole.MEMBER),
    ).toThrow(
      new ForbiddenException(
        "Você não pode administrar Convites deste Grupo.",
      ),
    );
  });

  it("allows the Group Owner to manage member roles", () => {
    expect(() =>
      policy.assertCanManageMemberRoles(GroupRole.OWNER),
    ).not.toThrow();
  });

  it("forbids an Organizer from managing member roles", () => {
    expect(() =>
      policy.assertCanManageMemberRoles(GroupRole.ORGANIZER),
    ).toThrow(
      new ForbiddenException(
        "Você não pode alterar papéis deste Grupo.",
      ),
    );
  });

  it("forbids a Member from managing member roles", () => {
    expect(() =>
      policy.assertCanManageMemberRoles(GroupRole.MEMBER),
    ).toThrow(
      new ForbiddenException(
        "Você não pode alterar papéis deste Grupo.",
      ),
    );
  });
});
