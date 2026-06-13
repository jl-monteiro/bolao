"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setError(null);
    setIsPending(true);

    const { error: signOutError } = await authClient.signOut();

    if (signOutError) {
      setError("Não foi possível sair. Tente novamente.");
      setIsPending(false);
      return;
    }

    router.replace("/entrar");
    router.refresh();
  }

  return (
    <div className="logout-control">
      <button
        className="button button-ghost button-small app-logout"
        disabled={isPending}
        onClick={handleLogout}
        type="button"
      >
        {isPending ? "Saindo…" : "Sair"}
      </button>
      {error ? (
        <span className="logout-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
