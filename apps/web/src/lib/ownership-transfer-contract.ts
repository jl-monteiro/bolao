export type OwnershipTransferStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

export type OwnershipTransfer = {
  acceptedAt: string | null;
  currentOwnerMembership: {
    id: string;
    user: {
      id: string;
      image: string | null;
      name: string;
    };
  };
  expiredAt: string | null;
  expiresAt: string;
  group: {
    id: string;
    name: string;
  };
  id: string;
  requestedAt: string;
  revokedAt: string | null;
  status: OwnershipTransferStatus;
  targetMembership: {
    id: string;
    user: {
      id: string;
      image: string | null;
      name: string;
    };
  };
};

export type CreateOwnershipTransferBody = {
  targetMembershipId: string;
};

export type AcceptOwnershipTransferBody = {
  totpCode: string;
};

const statusLabels: Record<OwnershipTransferStatus, string> = {
  ACCEPTED: "Aceita",
  EXPIRED: "Expirada",
  PENDING: "Pendente",
  REVOKED: "Revogada",
};

export function buildGroupOwnershipTransfersPath(groupId: string): string {
  return `/v1/groups/${encodeURIComponent(groupId)}/ownership-transfers`;
}

export function buildGroupOwnershipTransferPath(
  groupId: string,
  transferId: string,
): string {
  return `${buildGroupOwnershipTransfersPath(groupId)}/${encodeURIComponent(
    transferId,
  )}`;
}

export function buildMyOwnershipTransfersPath(): string {
  return "/v1/me/ownership-transfers";
}

export function buildOwnershipTransferAcceptPath(
  transferId: string,
): string {
  return `/v1/me/ownership-transfers/${encodeURIComponent(
    transferId,
  )}/accept`;
}

export function createOwnershipTransferBody(
  targetMembershipId: string,
): CreateOwnershipTransferBody {
  return { targetMembershipId };
}

export function createOwnershipTransferAcceptBody(
  totpCode: string,
): AcceptOwnershipTransferBody {
  return { totpCode: totpCode.trim() };
}

export function getOwnershipTransferStatusLabel(
  status: OwnershipTransferStatus,
): string {
  return statusLabels[status];
}
