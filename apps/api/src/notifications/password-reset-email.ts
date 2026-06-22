import type { EmailMessage } from "./notification-provider.js";

type PasswordResetEmailInput = {
  email: string;
  name: string;
  url: string;
};

export function buildPasswordResetEmail(
  input: PasswordResetEmailInput,
): EmailMessage {
  return {
    subject: "Redefina sua senha no Bolao",
    text: [
      `Ola, ${input.name}.`,
      "",
      "Use o link abaixo para redefinir sua senha:",
      input.url,
      "",
      "O link expira em 1 hora. Se voce nao pediu a redefinicao, ignore esta mensagem.",
    ].join("\n"),
    to: input.email,
  };
}
