import "server-only";

import { headers } from "next/headers";
import {
  getIdentityApiErrorMessage,
  type ActivatedPendingMembership,
  type SubmittedIdentity,
  type SubmitIdentityInput,
} from "@/lib/identity-contract";

const apiUrl =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export class IdentityApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "IdentityApiError";
  }
}

async function getCookieHeader() {
  const requestHeaders = await headers();
  return requestHeaders.get("cookie");
}

async function postProtectedResource<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const cookie = await getCookieHeader();
  const response = await fetch(`${apiUrl}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new IdentityApiError(
      getIdentityApiErrorMessage(
        payload,
        "Não foi possível concluir a ativação. Tente novamente.",
      ),
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function submitIdentity(
  input: SubmitIdentityInput,
): Promise<SubmittedIdentity> {
  return postProtectedResource<SubmittedIdentity>("/v1/me/identity", input);
}

export function activatePendingMembership(
  pendingId: string,
): Promise<ActivatedPendingMembership> {
  return postProtectedResource<ActivatedPendingMembership>(
    `/v1/me/pending-memberships/${encodeURIComponent(pendingId)}/activate`,
  );
}

