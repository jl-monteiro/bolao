export type GroupInviteStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

export type PendingMembershipStatus = "PENDING" | "ACTIVATED" | "EXPIRED";

export type GroupInvite = {
  acceptedAt: string | null;
  expiredAt: string | null;
  expiresAt: string;
  id: string;
  issuedAt: string;
  issuedBy: {
    id: string;
    name: string;
  };
  revokedAt: string | null;
  status: GroupInviteStatus;
  targetEmail: string;
};

export type GroupPendingMember = {
  acceptedAt: string;
  expiresAt: string;
  id: string;
  status: PendingMembershipStatus;
  user: {
    id: string;
    image: string | null;
    name: string;
  };
};

export type GroupInvitePreview = {
  expiresAt: string;
  groupName: string;
  issuedByName: string;
};

export type GroupInviteAcceptance = {
  acceptedAt: string;
  expiresAt: string;
  id: string;
  status: PendingMembershipStatus;
};

type ApiErrorPayload = {
  message?: string | string[];
};

const invitePath = "/convites/aceitar";
const memberActivationPath = "/ativar-membro/";
const tokenPattern = /^[A-Za-z0-9_-]+$/;
const memberActivationSegmentPattern = /^[A-Za-z0-9_-]+$/;

const inviteStatusLabels: Record<GroupInviteStatus, string> = {
  ACCEPTED: "Aceito",
  EXPIRED: "Expirado",
  PENDING: "Pendente",
  REVOKED: "Revogado",
};

const pendingMemberStatusLabels: Record<PendingMembershipStatus, string> = {
  ACTIVATED: "Ativado",
  EXPIRED: "Expirado",
  PENDING: "Validação pendente",
};

export function getSafeAuthenticatedReturnPath(value: unknown): string {
  if (typeof value !== "string") {
    return "/app";
  }

  if (value.startsWith(invitePath)) {
    return invitePath;
  }

  if (value.startsWith(memberActivationPath)) {
    const segment = value.slice(memberActivationPath.length);

    if (memberActivationSegmentPattern.test(segment)) {
      return value;
    }
  }

  return "/app";
}

export function getSafeInviteReturnPath(value: unknown): string {
  return getSafeAuthenticatedReturnPath(value);
}

export function buildInviteLoginHref(): string {
  return `/entrar?retorno=${encodeURIComponent(invitePath)}`;
}

export function parseInviteToken(fragment: string): string | null {
  if (!fragment.startsWith("#")) {
    return null;
  }

  const token = new URLSearchParams(fragment.slice(1)).get("token")?.trim();
  return token && tokenPattern.test(token) ? token : null;
}

export function getApiErrorMessage(
  payload: ApiErrorPayload | null,
  fallback: string,
): string {
  if (Array.isArray(payload?.message)) {
    return payload.message[0] ?? fallback;
  }

  return payload?.message ?? fallback;
}

export function getInviteStatusLabel(status: GroupInviteStatus): string {
  return inviteStatusLabels[status];
}

export function getPendingMemberStatusLabel(
  status: PendingMembershipStatus,
): string {
  return pendingMemberStatusLabels[status];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNestedRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = record[key];
  return isRecord(value) ? value : null;
}

function getString(
  record: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isDateString(value: string | null): value is string {
  return value !== null && !Number.isNaN(Date.parse(value));
}

export function parseInvitePreview(
  payload: unknown,
): GroupInvitePreview | null {
  if (!isRecord(payload)) {
    return null;
  }

  const group = getNestedRecord(payload, "group");
  const issuedBy = getNestedRecord(payload, "issuedBy");
  const expiresAt = getString(payload, "expiresAt");
  const groupName =
    getString(payload, "groupName") ?? getString(group, "name");
  const issuedByName =
    getString(payload, "issuedByName") ?? getString(issuedBy, "name");

  if (!isDateString(expiresAt) || !groupName || !issuedByName) {
    return null;
  }

  return {
    expiresAt,
    groupName,
    issuedByName,
  };
}

export function parseInviteAcceptance(
  payload: unknown,
): GroupInviteAcceptance | null {
  if (!isRecord(payload)) {
    return null;
  }

  const pendingMembership =
    getNestedRecord(payload, "pendingMembership") ?? payload;
  const acceptedAt = getString(pendingMembership, "acceptedAt");
  const expiresAt = getString(pendingMembership, "expiresAt");
  const id = getString(pendingMembership, "id");
  const status = getString(pendingMembership, "status");

  if (
    !isDateString(acceptedAt) ||
    !isDateString(expiresAt) ||
    !id ||
    status !== "PENDING"
  ) {
    return null;
  }

  return {
    acceptedAt,
    expiresAt,
    id,
    status,
  };
}

export type IncomingGroupInvite = {
  expiresAt: string;
  group: {
    id: string;
    name: string;
  };
  id: string;
  issuedAt: string;
  issuedBy: {
    id: string;
    name: string;
  };
  status: GroupInviteStatus;
};

export type MePendingMembership = {
  acceptedAt: string;
  expiresAt: string;
  group: {
    id: string;
    name: string;
  };
  id: string;
  status: PendingMembershipStatus;
};
