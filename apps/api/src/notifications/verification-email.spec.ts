import { buildVerificationEmail } from "./verification-email.js";

describe("buildVerificationEmail", () => {
  it("creates a Portuguese verification message with the Better Auth URL", () => {
    const message = buildVerificationEmail({
      email: "pessoa@example.com",
      name: "Pessoa",
      url: "https://api.example.com/v1/auth/verify-email?token=abc",
    });

    expect(message).toEqual({
      subject: "Confirme seu e-mail no Bolao",
      text: expect.stringContaining(
        "https://api.example.com/v1/auth/verify-email?token=abc",
      ),
      to: "pessoa@example.com",
    });
    expect(message.text).toContain("Pessoa");
  });
});
