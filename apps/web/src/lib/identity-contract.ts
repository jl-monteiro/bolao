export type SubmitIdentityInput = {
  birthDate: string;
  cpf: string;
  fullName: string;
};

export type SubmittedIdentity = {
  birthDate: string;
  cpf: string;
  identityValidatedAt: string;
  name: string;
};

export type ActivatedPendingMembership = {
  groupId: string;
  joinedAt: string;
  pendingMembershipId: string;
  role: "MEMBER";
};

export type IdentityActivationFormState = {
  message: string | null;
  status: "error" | "idle";
};

export const initialIdentityActivationFormState: IdentityActivationFormState = {
  message: null,
  status: "idle",
};

const memberActivationSegmentPattern = /^[A-Za-z0-9_-]+$/;

type ApiErrorPayload = {
  message?: string | string[];
};

export function buildMemberActivationPath(pendingId: string): string {
  return `/ativar-membro/${encodeURIComponent(pendingId)}`;
}

export function buildMemberActivationLoginHref(pendingId: string): string {
  return `/entrar?retorno=${encodeURIComponent(
    buildMemberActivationPath(pendingId),
  )}`;
}

export function isSafeMemberActivationPath(value: string): boolean {
  if (!value.startsWith("/ativar-membro/")) {
    return false;
  }

  const segment = value.slice("/ativar-membro/".length);
  return memberActivationSegmentPattern.test(segment);
}

export function getIdentityApiErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  const errorPayload =
    typeof payload === "object" && payload !== null
      ? (payload as ApiErrorPayload)
      : null;

  if (Array.isArray(errorPayload?.message)) {
    return errorPayload.message[0] ?? fallback;
  }

  return errorPayload?.message ?? fallback;
}
