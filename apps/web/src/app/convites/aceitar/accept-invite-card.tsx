"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildInviteLoginHref,
  parseInviteAcceptance,
  parseInvitePreview,
  parseInviteToken,
  type GroupInviteAcceptance,
  type GroupInvitePreview,
} from "@/lib/group-invites-contract";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type AcceptInviteCardProps = {
  isAuthenticated: boolean;
};

type InviteCardState =
  | { kind: "accepted"; result: GroupInviteAcceptance }
  | { kind: "expired" }
  | { kind: "loading" }
  | { kind: "network-error" }
  | { kind: "preview"; preview: GroupInvitePreview }
  | { kind: "sign-in" }
  | { kind: "storage-error" }
  | { kind: "unavailable" };

export function AcceptInviteCard({
  isAuthenticated,
}: AcceptInviteCardProps) {
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<InviteCardState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    async function initialize() {
      await Promise.resolve();

      const fragmentToken = parseInviteToken(window.location.hash);

      if (fragmentToken) {
        window.history.replaceState(null, "", "/convites/aceitar");
        const preserveResponse = await fetch("/api/group-invites/token", {
          body: JSON.stringify({ token: fragmentToken }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        }).catch(() => null);

        if (!preserveResponse?.ok) {
          if (active) {
            setState({ kind: "storage-error" });
          }
          return;
        }
      }

      if (!active) {
        return;
      }

      if (!isAuthenticated) {
        setState({ kind: "sign-in" });
        return;
      }

      setState({ kind: "loading" });

      try {
        const response = await fetch("/api/group-invites/preview", {
          method: "POST",
        });

        if (!active) {
          return;
        }

        if (response.status === 410) {
          setState({ kind: "expired" });
          return;
        }

        if (response.status === 401) {
          setState({ kind: "sign-in" });
          return;
        }

        if (response.status >= 500) {
          setState({ kind: "network-error" });
          return;
        }

        if (!response.ok) {
          setState({ kind: "unavailable" });
          return;
        }

        const preview = parseInvitePreview(await response.json());
        setState(
          preview
            ? { kind: "preview", preview }
            : { kind: "unavailable" },
        );
      } catch {
        if (active) {
          setState({ kind: "network-error" });
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [isAuthenticated, retryCount]);

  async function acceptInvite(preview: GroupInvitePreview) {
    setAcceptError(null);
    setIsAccepting(true);

    try {
      const response = await fetch("/api/group-invites/accept", {
        method: "POST",
      });

      if (response.status === 410) {
        setState({ kind: "expired" });
        return;
      }

      if (response.status === 401) {
        setState({ kind: "sign-in" });
        return;
      }

      if (response.status >= 500) {
        setAcceptError(
          "Não foi possível concluir o aceite. Confira sua conexão e tente novamente.",
        );
        setState({ kind: "preview", preview });
        return;
      }

      if (!response.ok) {
        setState({ kind: "unavailable" });
        return;
      }

      const result = parseInviteAcceptance(await response.json());
      if (!result) {
        setState({ kind: "unavailable" });
        return;
      }

      setState({ kind: "accepted", result });
    } catch {
      setAcceptError(
        "Não foi possível concluir o aceite. Confira sua conexão e tente novamente.",
      );
      setState({ kind: "preview", preview });
    } finally {
      setIsAccepting(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <article aria-busy="true" className="invite-accept-card">
        <p className="kicker">Verificando convite</p>
        <div aria-hidden="true" className="invite-card-skeleton">
          <span />
          <span />
          <span />
        </div>
        <span className="sr-only">Verificando convite.</span>
      </article>
    );
  }

  if (state.kind === "sign-in") {
    return (
      <article aria-live="polite" className="invite-accept-card">
        <p className="kicker">Autenticação necessária</p>
        <h2>Entre para revisar este convite</h2>
        <p>
          Para proteger o Grupo e a pessoa convidada, nenhum detalhe é
          exibido antes do acesso.
        </p>
        <Link
          className="button button-accent button-large"
          href={buildInviteLoginHref()}
        >
          Entrar na minha conta
        </Link>
      </article>
    );
  }

  if (state.kind === "storage-error") {
    return (
      <article aria-live="polite" className="invite-accept-card">
        <p className="kicker">Armazenamento bloqueado</p>
        <h2>Não foi possível preparar o login</h2>
        <p>
          Permita o armazenamento de sessão neste navegador e abra novamente
          o link original do convite. O token não será enviado pela URL de
          login.
        </p>
      </article>
    );
  }

  if (state.kind === "preview") {
    return (
      <article aria-live="polite" className="invite-accept-card">
        <p className="kicker">Convite validado</p>
        <h2>{state.preview.groupName}</h2>
        <dl className="invite-preview-details">
          <div>
            <dt>Enviado por</dt>
            <dd>{state.preview.issuedByName}</dd>
          </div>
          <div>
            <dt>Válido até</dt>
            <dd>{dateFormatter.format(new Date(state.preview.expiresAt))}</dd>
          </div>
        </dl>
        <div className="invite-accept-notice">
          <strong>O que acontece ao aceitar?</strong>
          <p>
            Sua conta se torna um Membro Pendente por até 30 dias. Você ainda
            não terá acesso aos dados privados do Grupo.
          </p>
        </div>
        {acceptError ? (
          <p aria-live="polite" className="invite-accept-error" role="alert">
            {acceptError}
          </p>
        ) : null}
        <button
          className="button button-accent button-large"
          disabled={isAccepting}
          onClick={() => acceptInvite(state.preview)}
          type="button"
        >
          {isAccepting ? "Aceitando…" : "Aceitar convite"}
        </button>
      </article>
    );
  }

  if (state.kind === "accepted") {
    return (
      <article
        aria-live="polite"
        className="invite-accept-card invite-accept-success"
        role="status"
      >
        <p className="kicker">Convite aceito</p>
        <h2>Você agora é um Membro Pendente</h2>
        <p>
          A validação de identidade ainda precisa ser concluída. Até lá, sua
          conta não possui acesso aos dados privados do Grupo.
        </p>
        <p className="invite-pending-deadline">
          Prazo da pendência:{" "}
          <strong>{dateFormatter.format(new Date(state.result.expiresAt))}</strong>
        </p>
        <Link className="button button-ghost button-large" href="/app">
          Voltar aos meus Grupos
        </Link>
      </article>
    );
  }

  if (state.kind === "expired") {
    return (
      <article aria-live="polite" className="invite-accept-card">
        <p className="kicker">Prazo encerrado</p>
        <h2>Este convite expirou</h2>
        <p>
          Solicite um novo convite ao Proprietário ou Organizador do Grupo.
        </p>
        <Link className="button button-ghost button-large" href="/app">
          Voltar aos meus Grupos
        </Link>
      </article>
    );
  }

  if (state.kind === "network-error") {
    return (
      <article aria-live="polite" className="invite-accept-card">
        <p className="kicker">Falha de conexão</p>
        <h2>Não foi possível verificar o convite</h2>
        <p>Confira sua conexão e tente novamente.</p>
        <button
          className="button button-primary button-large"
          onClick={() => setRetryCount((count) => count + 1)}
          type="button"
        >
          Tentar novamente
        </button>
      </article>
    );
  }

  return (
    <article aria-live="polite" className="invite-accept-card">
      <p className="kicker">Convite indisponível</p>
      <h2>Não foi possível usar este convite</h2>
      <p>
        Ele pode ser inválido, ter sido revogado ou pertencer a outra conta.
        Nenhuma alteração foi feita.
      </p>
      <Link className="button button-ghost button-large" href="/app">
        Voltar aos meus Grupos
      </Link>
    </article>
  );
}
