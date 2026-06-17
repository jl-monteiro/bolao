import {
  buildGroupInviteAcceptUrl,
  buildGroupInviteEmail,
} from "./group-invite-email.js";

describe("group invitation email", () => {
  const input = {
    groupName: "Copa 2026",
    inviterName: "Ana",
    rawToken: "raw_token-123",
    recipientEmail: "pessoa@example.com",
    webUrl: "https://bolao.example.com",
  };

  it("places the raw token only in the invitation URL fragment", () => {
    const acceptUrl = buildGroupInviteAcceptUrl(input);

    expect(acceptUrl).toBe(
      "https://bolao.example.com/convites/aceitar#token=raw_token-123",
    );
    expect(acceptUrl).not.toContain("?token=");
  });

  it("builds a Portuguese invitation message through the shared email shape", () => {
    const message = buildGroupInviteEmail(input);

    expect(message.subject).toBe("Convite para o Grupo Copa 2026");
    expect(message.to).toBe("pessoa@example.com");
    expect(message.text).toContain(
      "https://bolao.example.com/convites/aceitar#token=raw_token-123",
    );
    expect(message.text).toContain("Ana");
    expect(message.text).not.toContain("?token=");
  });

  it("removes header-breaking characters from the email subject", () => {
    const message = buildGroupInviteEmail({
      ...input,
      groupName: "Copa 2026\r\nBcc: attacker@example.com",
    });

    expect(message.subject).toBe(
      "Convite para o Grupo Copa 2026 Bcc: attacker@example.com",
    );
    expect(message.subject).not.toMatch(/[\r\n]/);
  });
});
