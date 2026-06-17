"use client";

import {
  CheckCircle2Icon,
} from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getApiErrorMessage,
  getInviteStatusLabel,
  getPendingMemberStatusLabel,
  type GroupInvite,
  type GroupPendingMember,
} from "@/lib/group-invites-contract";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type GroupInvitesPanelProps = {
  groupId: string;
  hasLoadError?: boolean;
  invites: GroupInvite[];
  pendingMembers: GroupPendingMember[];
};

type Feedback = {
  message: string;
  type: "error" | "success";
} | null;

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function getStatusBadgeVariant(
  status: GroupInvite["status"] | GroupPendingMember["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACCEPTED" || status === "ACTIVATED") {
    return "default";
  }

  if (status === "PENDING") {
    return "secondary";
  }

  if (status === "REVOKED") {
    return "destructive";
  }

  return "outline";
}

export function GroupInvitesPanel({
  groupId,
  hasLoadError = false,
  invites,
  pendingMembers,
}: GroupInvitesPanelProps) {
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const revokeButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cancelRevokeButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmingInviteId, setConfirmingInviteId] = useState<string | null>(
    null,
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [activatingMemberId, setActivatingMemberId] = useState<string | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus();
    }
  }, [feedback]);

  useEffect(() => {
    if (confirmingInviteId) {
      cancelRevokeButtonRef.current?.focus();
    }
  }, [confirmingInviteId]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!email) {
      setEmailError("Informe o e-mail da pessoa.");
      emailInputRef.current?.focus();
      return;
    }

    if (!emailInputRef.current?.validity.valid) {
      setEmailError("Informe um endereço de e-mail válido.");
      emailInputRef.current?.focus();
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(`${apiUrl}/v1/groups/${groupId}/invites`, {
        body: JSON.stringify({ email }),
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setFeedback({
          message: getApiErrorMessage(
            payload,
            "Não foi possível enviar o convite. Tente novamente.",
          ),
          type: "error",
        });
        if (response.status === 503) {
          router.refresh();
        }
        return;
      }

      form.reset();
      setFeedback({
        message: `Convite enviado para ${email}.`,
        type: "success",
      });
      router.refresh();
    } catch {
      setFeedback({
        message:
          "Não foi possível conectar ao servidor. Tente novamente em instantes.",
        type: "error",
      });
    } finally {
      setIsCreating(false);
    }
  }

  function cancelRevoke(inviteId: string) {
    setConfirmingInviteId(null);
    requestAnimationFrame(() => {
      revokeButtonRefs.current[inviteId]?.focus();
    });
  }

  async function revokeInvite(inviteId: string) {
    setFeedback(null);
    setRevokingInviteId(inviteId);

    try {
      const response = await fetch(
        `${apiUrl}/v1/groups/${groupId}/invites/${inviteId}`,
        {
          credentials: "include",
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setFeedback({
          message: getApiErrorMessage(
            payload,
            "Não foi possível revogar o convite. Tente novamente.",
          ),
          type: "error",
        });
        return;
      }

      setConfirmingInviteId(null);
      setFeedback({
        message: "Convite revogado.",
        type: "success",
      });
      router.refresh();
    } catch {
      setFeedback({
        message:
          "Não foi possível conectar ao servidor. Tente novamente em instantes.",
        type: "error",
      });
    } finally {
      setRevokingInviteId(null);
    }
  }

  async function activatePendingMember(pendingMemberId: string) {
    setFeedback(null);
    setActivatingMemberId(pendingMemberId);

    try {
      const response = await fetch(
        `${apiUrl}/v1/groups/${groupId}/pending-members/${pendingMemberId}/activate`,
        {
          credentials: "include",
          method: "POST",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setFeedback({
          message: getApiErrorMessage(
            payload,
            "NÃ£o foi possÃ­vel ativar o Membro Pendente. Tente novamente.",
          ),
          type: "error",
        });
        return;
      }

      setFeedback({
        message: "Membro Pendente ativado.",
        type: "success",
      });
      router.refresh();
    } catch {
      setFeedback({
        message:
          "NÃ£o foi possÃ­vel conectar ao servidor. Tente novamente em instantes.",
        type: "error",
      });
    } finally {
      setActivatingMemberId(null);
    }
  }

  const pendingInviteCount = invites.filter(
    (invite) => invite.status === "PENDING",
  ).length;

  return (
    <section
      aria-labelledby="group-invites-title"
      className="members-panel group-invites-panel"
    >
      <div className="panel-heading">
        <div>
          <p className="kicker">Acesso</p>
          <h2 id="group-invites-title">Convites</h2>
        </div>
        <span aria-label={`${pendingInviteCount} convites pendentes`}>
          {String(pendingInviteCount).padStart(2, "0")}
        </span>
      </div>

      <div className="invite-management-body">
        {hasLoadError ? (
          <p className="form-error" role="alert">
            Não foi possível carregar todos os Convites e Membros Pendentes.
            Recarregue a página para tentar novamente.
          </p>
        ) : null}
        <form
          aria-busy={isCreating}
          className="invite-form"
          noValidate
          onSubmit={handleCreate}
        >
          <div className="field field-light">
            <label htmlFor="invite-email">
              E-mail da pessoa <span aria-hidden="true">*</span>
            </label>
            <input
              aria-describedby={
                emailError ? "invite-email-error" : "invite-email-help"
              }
              aria-invalid={emailError ? true : undefined}
              autoComplete="email"
              id="invite-email"
              inputMode="email"
              name="email"
              onChange={() => setEmailError(null)}
              ref={emailInputRef}
              required
              spellCheck={false}
              type="email"
            />
            {emailError ? (
              <span className="form-error" id="invite-email-error" role="alert">
                {emailError}
              </span>
            ) : (
              <span className="field-help-light" id="invite-email-help">
                O convite expira em 7 dias e será enviado por e-mail.
              </span>
            )}
          </div>
          <button
            className="button button-primary"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "Enviando…" : "Enviar convite"}
          </button>
        </form>

        <div aria-live="polite" className="invite-feedback">
          {feedback ? (
            <p
              className={
                feedback.type === "error" ? "form-error" : "form-success"
              }
              ref={feedbackRef}
              role={feedback.type === "error" ? "alert" : "status"}
              tabIndex={-1}
            >
              {feedback.message}
            </p>
          ) : null}
        </div>

        <div className="invite-section">
          <div className="invite-section-heading">
            <h3>Convites enviados</h3>
            <span>{invites.length}</span>
          </div>

          {invites.length === 0 ? (
            <div className="compact-empty-state">
              <strong>Nenhum convite enviado</strong>
              <p>
                Use o formulário acima para convidar a primeira pessoa.
              </p>
            </div>
          ) : (
            <ul className="invite-list">
              {invites.map((invite) => {
                const isConfirming = confirmingInviteId === invite.id;
                const isRevoking = revokingInviteId === invite.id;

                return (
                  <li className="invite-row" key={invite.id}>
                    <div className="invite-row-main">
                      <strong>{invite.targetEmail}</strong>
                      <Badge variant={getStatusBadgeVariant(invite.status)}>
                        {getInviteStatusLabel(invite.status)}
                      </Badge>
                    </div>
                    <dl className="invite-metadata">
                      <div>
                        <dt>Enviado por</dt>
                        <dd>{invite.issuedBy.name}</dd>
                      </div>
                      <div>
                        <dt>Emissão</dt>
                        <dd>{formatDate(invite.issuedAt)}</dd>
                      </div>
                      <div>
                        <dt>Validade</dt>
                        <dd>{formatDate(invite.expiresAt)}</dd>
                      </div>
                    </dl>

                    {invite.status === "PENDING" ? (
                      <div className="invite-row-actions">
                        {isConfirming ? (
                          <div
                            aria-label={`Confirmar revogação do convite de ${invite.targetEmail}`}
                            className="inline-confirmation"
                            role="group"
                          >
                            <p>Revogar este convite?</p>
                            <div>
                              <button
                                className="button button-ghost button-small"
                                disabled={isRevoking}
                                onClick={() => cancelRevoke(invite.id)}
                                ref={cancelRevokeButtonRef}
                                type="button"
                              >
                                Cancelar
                              </button>
                              <button
                                className="button button-danger button-small"
                                disabled={isRevoking}
                                onClick={() => revokeInvite(invite.id)}
                                type="button"
                              >
                                {isRevoking ? "Revogando…" : "Confirmar"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            aria-label={`Revogar convite de ${invite.targetEmail}`}
                            className="text-button danger-text-button"
                            onClick={() => setConfirmingInviteId(invite.id)}
                            ref={(element) => {
                              revokeButtonRefs.current[invite.id] = element;
                            }}
                            type="button"
                          >
                            Revogar convite
                          </button>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="invite-section pending-members-section">
          <div className="invite-section-heading">
            <div>
              <h3>Membros Pendentes</h3>
              <p>Aguardando validação de identidade, sem acesso ao Grupo.</p>
            </div>
            <span>{pendingMembers.length}</span>
          </div>

          {pendingMembers.length === 0 ? (
            <div className="compact-empty-state">
              <strong>Nenhum Membro Pendente</strong>
              <p>Convites aceitos aparecerão aqui por até 30 dias.</p>
            </div>
          ) : (
            <ul className="invite-list">
              {pendingMembers.map((member) => (
                <li className="invite-row pending-member-row" key={member.id}>
                  <div className="invite-row-main">
                    <div className="pending-member-identity">
                      <strong>{member.user.name}</strong>
                      <span>Conta autenticada</span>
                    </div>
                    <Badge variant={getStatusBadgeVariant(member.status)}>
                      {getPendingMemberStatusLabel(member.status)}
                    </Badge>
                  </div>
                  <dl className="invite-metadata">
                    <div>
                      <dt>Aceite</dt>
                      <dd>{formatDate(member.acceptedAt)}</dd>
                    </div>
                    <div>
                      <dt>Prazo da pendência</dt>
                      <dd>{formatDate(member.expiresAt)}</dd>
                    </div>
                  </dl>
                  {member.status === "PENDING" ? (
                    <div className="invite-row-actions">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={activatingMemberId === member.id}
                            size="sm"
                            type="button"
                          >
                            <CheckCircle2Icon data-icon="inline-start" />
                            Ativar membro
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Ativar {member.user.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Confirme somente depois de validar a identidade
                              da pessoa. A conta passa a acessar os dados
                              privados deste Grupo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              disabled={activatingMemberId === member.id}
                            >
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={activatingMemberId === member.id}
                              onClick={() => activatePendingMember(member.id)}
                            >
                              {activatingMemberId === member.id
                                ? "Ativando..."
                                : "Confirmar ativação"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
