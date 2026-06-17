import type { EmailMessage } from "./notification-provider.js";

type GroupInviteEmailInput = {
  groupName: string;
  inviterName: string;
  rawToken: string;
  recipientEmail: string;
  webUrl: string;
};

export function buildGroupInviteAcceptUrl(
  input: Pick<GroupInviteEmailInput, "rawToken" | "webUrl">,
): string {
  const url = new URL("/convites/aceitar", input.webUrl);
  url.hash = new URLSearchParams({ token: input.rawToken }).toString();
  return url.toString();
}

export function buildGroupInviteEmail(
  input: GroupInviteEmailInput,
): EmailMessage {
  const acceptUrl = buildGroupInviteAcceptUrl(input);
  const safeGroupName = input.groupName.replace(/[\r\n]+/g, " ").trim();

  return {
    subject: `Convite para o Grupo ${safeGroupName}`,
    text: [
      `Olá, você recebeu um convite de ${input.inviterName}.`,
      "",
      `Aceite o convite para o Grupo ${input.groupName}:`,
      acceptUrl,
      "",
      "Este convite expira em 7 dias.",
      "Se você não esperava este convite, ignore esta mensagem.",
    ].join("\n"),
    to: input.recipientEmail,
  };
}
