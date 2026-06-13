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
});
