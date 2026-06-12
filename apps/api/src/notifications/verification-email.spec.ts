import { buildVerificationEmail } from "./verification-email.js";

describe("buildVerificationEmail", () => {
  it("creates a Portuguese verification message with the Better Auth URL", () => {
    const message = buildVerificationEmail({
      email: "pessoa@example.com",
      name: "Pessoa",
      url: "https://api.example.com/v1/auth/verify-email?token=abc",
    });

    expect(message.subject).toBe("Confirme seu e-mail no Bolao");
    expect(message.to).toBe("pessoa@example.com");
    expect(message.text).toContain(
      "https://api.example.com/v1/auth/verify-email?token=abc",
    );
    expect(message.text).toContain("Pessoa");
  });
});
