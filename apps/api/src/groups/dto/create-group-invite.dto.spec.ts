import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateGroupInviteDto } from "./create-group-invite.dto.js";

describe("CreateGroupInviteDto", () => {
  it("normalizes a valid recipient email", async () => {
    const input = plainToInstance(CreateGroupInviteDto, {
      email: "  Pessoa@Example.COM ",
    });

    await expect(validate(input)).resolves.toHaveLength(0);
    expect(input.email).toBe("pessoa@example.com");
  });

  it("rejects an invalid recipient email", async () => {
    const input = plainToInstance(CreateGroupInviteDto, {
      email: "not-an-email",
    });

    const errors = await validate(input);

    expect(errors).toHaveLength(1);
  });
});
