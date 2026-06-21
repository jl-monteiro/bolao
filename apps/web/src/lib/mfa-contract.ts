export type MfaStatus = {
  enabledAt: string | null;
  totpEnabled: boolean;
};

export type MfaSetup = {
  otpauthUri: string;
  secret: string;
};

export type ConfirmMfaBody = {
  code: string;
};

export function buildMfaStatusPath(): string {
  return "/v1/me/mfa";
}

export function buildMfaSetupPath(): string {
  return "/v1/me/mfa/totp/setup";
}

export function buildMfaConfirmPath(): string {
  return "/v1/me/mfa/totp/confirm";
}

export function createConfirmMfaBody(code: string): ConfirmMfaBody {
  return { code: code.trim() };
}

export function isSixDigitCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}
