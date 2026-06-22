import { buildPasswordResetEmail } from "./password-reset-email.js";

describe("buildPasswordResetEmail", () => {
  it("creates a Portuguese password reset message with the Better Auth URL", () => {
    const message = buildPasswordResetEmail({
      email: "pessoa@example.com",
      name: "Pessoa",
      url: "https://api.example.com/v1/auth/reset-password/token?callbackURL=https%3A%2F%2Fapp.example.com%2Fredefinir-senha",
    });

    expect(message.subject).toBe("Redefina sua senha no Bolao");
    expect(message.to).toBe("pessoa@example.com");
    expect(message.text).toContain("Pessoa");
    expect(message.text).toContain("O link expira em 1 hora.");
    expect(message.text).toContain(
      "https://api.example.com/v1/auth/reset-password/token",
    );
  });
});
