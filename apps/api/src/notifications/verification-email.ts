import type { EmailMessage } from "./notification-provider.js";

type VerificationEmailInput = {
  email: string;
  name: string;
  url: string;
};

export function buildVerificationEmail(
  input: VerificationEmailInput,
): EmailMessage {
  return {
    subject: "Confirme seu e-mail no Bolao",
    text: [
      `Ola, ${input.name}.`,
      "",
      "Confirme seu e-mail para acessar seus boloes:",
      input.url,
      "",
      "Se voce nao criou esta conta, ignore esta mensagem.",
    ].join("\n"),
    to: input.email,
  };
}
