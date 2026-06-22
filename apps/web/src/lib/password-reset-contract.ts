export type PasswordResetApiError = {
  code?: string;
  message?: string | string[];
};

const resetTokenPattern = /^[A-Za-z0-9_-]+$/;

export function getPasswordResetRedirectTo(origin: string): string {
  return `${origin}/redefinir-senha`;
}

export function parsePasswordResetToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim();
  return token.length > 0 && resetTokenPattern.test(token) ? token : null;
}

export function getPasswordResetRequestMessage(
  usesSandboxEmail: boolean,
): string {
  return usesSandboxEmail
    ? "Se o e-mail existir, o link aparecera no terminal da API."
    : "Se o e-mail existir, enviaremos um link para redefinir sua senha.";
}

export function getPasswordResetApiErrorMessage(
  error: PasswordResetApiError | null | undefined,
  fallback: string,
): string {
  if (Array.isArray(error?.message)) {
    return error.message[0] ?? fallback;
  }

  if (error?.code === "INVALID_TOKEN") {
    return "Link invalido ou expirado. Solicite uma nova redefinicao.";
  }

  if (error?.code === "PASSWORD_TOO_SHORT") {
    return "Use pelo menos 8 caracteres.";
  }

  if (error?.code === "PASSWORD_TOO_LONG") {
    return "Use uma senha com no maximo 128 caracteres.";
  }

  return error?.message ?? fallback;
}
