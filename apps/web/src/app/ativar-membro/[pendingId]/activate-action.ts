"use server";

import { redirect } from "next/navigation";
import {
  activatePendingMembership,
  IdentityApiError,
  submitIdentity,
} from "@/lib/identity-api";
import type { IdentityActivationFormState } from "@/lib/identity-contract";

function getRequiredString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function activateWithIdentity(
  pendingId: string,
  _previousState: IdentityActivationFormState,
  formData: FormData,
): Promise<IdentityActivationFormState> {
  const fullName = getRequiredString(formData, "fullName");
  const birthDate = getRequiredString(formData, "birthDate");
  const cpf = getRequiredString(formData, "cpf");

  if (!fullName || !birthDate || !cpf) {
    return {
      message: "Preencha nome completo, data de nascimento e CPF.",
      status: "error",
    };
  }

  try {
    await submitIdentity({ birthDate, cpf, fullName });
    await activatePendingMembership(pendingId);
  } catch (error: unknown) {
    if (error instanceof IdentityApiError) {
      return {
        message: error.message,
        status: "error",
      };
    }

    return {
      message:
        "Não foi possível conectar ao servidor. Tente novamente em instantes.",
      status: "error",
    };
  }

  redirect("/app?ativacao=concluida");
}

