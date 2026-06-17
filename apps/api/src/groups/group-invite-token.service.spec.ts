import { GroupInviteTokenService } from "./group-invite-token.service.js";

describe("GroupInviteTokenService", () => {
  const service = new GroupInviteTokenService();

  it("generates a URL-safe token backed by 32 random bytes", () => {
    const token = service.generate();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("hashes a token deterministically with SHA-256", () => {
    const token = "raw-token";

    expect(service.hash(token)).toBe(
      "34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943",
    );
    expect(service.hash(token)).toBe(service.hash(token));
    expect(service.hash(token)).not.toBe(token);
  });
});
