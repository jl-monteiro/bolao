"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCog, UserMinus } from "lucide-react";
import { getApiErrorMessage } from "@/lib/group-invites-contract";
import {
  buildGroupMemberRolePath,
  createGroupMemberRoleUpdateBody,
  getNextManageableGroupRole,
  type ManageableGroupRole,
} from "@/lib/group-members-contract";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const roleLabels: Record<ManageableGroupRole, string> = {
  MEMBER: "Membro",
  ORGANIZER: "Organizador",
};

type Feedback = {
  message: string;
  type: "error" | "success";
} | null;

type MemberRoleActionProps = {
  currentRole: ManageableGroupRole;
  groupId: string;
  memberName: string;
  membershipId: string;
};

export function MemberRoleAction({
  currentRole,
  groupId,
  memberName,
  membershipId,
}: MemberRoleActionProps) {
  const router = useRouter();
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const nextRole = getNextManageableGroupRole(currentRole);
  const isBusy = isSubmitting || isRefreshing;
  const actionLabel =
    nextRole === "ORGANIZER" ? "Promover" : "Rebaixar";
  const Icon = nextRole === "ORGANIZER" ? UserCog : UserMinus;

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus();
    }
  }, [feedback]);

  async function updateRole() {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${apiUrl}${buildGroupMemberRolePath(groupId, membershipId)}`,
        {
          body: JSON.stringify(createGroupMemberRoleUpdateBody(nextRole)),
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          method: "PATCH",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setFeedback({
          message: getApiErrorMessage(
            payload,
            "Não foi possível atualizar o papel. Tente novamente.",
          ),
          type: "error",
        });
        return;
      }

      setFeedback({
        message: `${memberName} agora é ${roleLabels[nextRole]}.`,
        type: "success",
      });
      startRefresh(() => {
        router.refresh();
      });
    } catch {
      setFeedback({
        message:
          "Não foi possível conectar ao servidor. Tente novamente em instantes.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="member-role-action-block">
      <button
        aria-label={`${actionLabel} ${memberName} para ${roleLabels[nextRole]}`}
        className="button button-ghost button-small member-role-action"
        disabled={isBusy}
        onClick={updateRole}
        type="button"
      >
        <Icon aria-hidden="true" />
        {isBusy ? "Atualizando..." : actionLabel}
      </button>
      <div aria-live="polite" className="member-role-feedback">
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
    </div>
  );
}
