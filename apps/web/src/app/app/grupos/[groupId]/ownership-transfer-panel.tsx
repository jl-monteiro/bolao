"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Crown, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/group-invites-contract";
import type { GroupMember } from "@/lib/group-members-contract";
import {
  buildGroupOwnershipTransferPath,
  buildGroupOwnershipTransfersPath,
  createOwnershipTransferBody,
  getOwnershipTransferStatusLabel,
  type OwnershipTransfer,
} from "@/lib/ownership-transfer-contract";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type Feedback = {
  message: string;
  type: "error" | "success";
} | null;

export function OwnershipTransferPanel({
  groupId,
  members,
  transfers,
}: {
  groupId: string;
  members: GroupMember[];
  transfers: OwnershipTransfer[];
}) {
  const router = useRouter();
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const [confirmingTransferId, setConfirmingTransferId] = useState<
    string | null
  >(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingTransferId, setRevokingTransferId] = useState<string | null>(
    null,
  );
  const pendingTransfer = transfers.find(
    (transfer) => transfer.status === "PENDING",
  );
  const eligibleMembers = members.filter((member) => member.role !== "OWNER");

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus();
    }
  }, [feedback]);

  async function requestTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const targetMembershipId = String(
      formData.get("targetMembershipId") ?? "",
    );
    const target = eligibleMembers.find(
      (member) => member.id === targetMembershipId,
    );

    if (!target) {
      setFeedback({
        message: "Escolha um Membro do Grupo.",
        type: "error",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(
        `${apiUrl}${buildGroupOwnershipTransfersPath(groupId)}`,
        {
          body: JSON.stringify(
            createOwnershipTransferBody(targetMembershipId),
          ),
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setFeedback({
          message: getApiErrorMessage(
            payload,
            "Não foi possível iniciar a transferência.",
          ),
          type: "error",
        });
        return;
      }

      setFeedback({
        message: `Transferência enviada para ${target.name}.`,
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

  async function revokeTransfer(transfer: OwnershipTransfer) {
    setFeedback(null);
    setRevokingTransferId(transfer.id);

    try {
      const response = await fetch(
        `${apiUrl}${buildGroupOwnershipTransferPath(groupId, transfer.id)}`,
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
            "Não foi possível revogar a transferência.",
          ),
          type: "error",
        });
        return;
      }

      setConfirmingTransferId(null);
      setFeedback({
        message: "Transferência revogada.",
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
      setRevokingTransferId(null);
    }
  }

  return (
    <section
      aria-labelledby="ownership-transfer-title"
      className="members-panel ownership-transfer-panel"
    >
      <div className="panel-heading">
        <div>
          <p className="kicker">Propriedade</p>
          <h2 id="ownership-transfer-title">Transferência</h2>
        </div>
        <Crown aria-hidden="true" className="panel-heading-icon" />
      </div>

      {pendingTransfer ? (
        <div className="ownership-transfer-card">
          <div className="invite-row-main">
            <strong>{pendingTransfer.targetMembership.user.name}</strong>
            <Badge variant="secondary">
              {getOwnershipTransferStatusLabel(pendingTransfer.status)}
            </Badge>
          </div>
          <dl className="invite-metadata">
            <div>
              <dt>Solicitada</dt>
              <dd>{dateFormatter.format(new Date(pendingTransfer.requestedAt))}</dd>
            </div>
            <div>
              <dt>Validade</dt>
              <dd>{dateFormatter.format(new Date(pendingTransfer.expiresAt))}</dd>
            </div>
          </dl>
          {confirmingTransferId === pendingTransfer.id ? (
            <div className="inline-confirmation">
              <p>Revogar esta transferência?</p>
              <div>
                <Button
                  disabled={revokingTransferId === pendingTransfer.id}
                  onClick={() => setConfirmingTransferId(null)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={revokingTransferId === pendingTransfer.id}
                  onClick={() => revokeTransfer(pendingTransfer)}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  {revokingTransferId === pendingTransfer.id
                    ? "Revogando..."
                    : "Confirmar"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setConfirmingTransferId(pendingTransfer.id)}
              type="button"
              variant="outline"
            >
              <RotateCcw aria-hidden="true" />
              Revogar solicitação
            </Button>
          )}
        </div>
      ) : (
        <form className="ownership-transfer-form" onSubmit={requestTransfer}>
          <label htmlFor="ownership-target">Novo Proprietário</label>
          <select
            disabled={isCreating || eligibleMembers.length === 0}
            id="ownership-target"
            name="targetMembershipId"
            required
          >
            <option value="">Selecione um Membro</option>
            {eligibleMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <Button
            className="button button-primary"
            disabled={isCreating || eligibleMembers.length === 0}
            type="submit"
          >
            <Crown aria-hidden="true" />
            {isCreating ? "Enviando..." : "Iniciar transferência"}
          </Button>
        </form>
      )}

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
    </section>
  );
}
