"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/group-invites-contract";
import { isSixDigitCode } from "@/lib/mfa-contract";
import {
  buildOwnershipTransferAcceptPath,
  createOwnershipTransferAcceptBody,
} from "@/lib/ownership-transfer-contract";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Feedback = {
  message: string;
  type: "error" | "success";
} | null;

export function OwnershipTransferAcceptAction({
  mfaEnabled,
  transferId,
}: {
  mfaEnabled: boolean;
  transferId: string;
}) {
  const router = useRouter();
  const codeInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus();
    }
  }, [feedback]);

  async function acceptTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const totpCode = String(formData.get("totpCode") ?? "").trim();

    if (!isSixDigitCode(totpCode)) {
      setFeedback({
        message: "Informe o código MFA de 6 dígitos.",
        type: "error",
      });
      codeInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${apiUrl}${buildOwnershipTransferAcceptPath(transferId)}`,
        {
          body: JSON.stringify(
            createOwnershipTransferAcceptBody(totpCode),
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
            "Não foi possível aceitar a transferência.",
          ),
          type: "error",
        });
        return;
      }

      setFeedback({
        message: "Propriedade transferida.",
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
      setIsSubmitting(false);
    }
  }

  if (!mfaEnabled) {
    return (
      <Button asChild className="button button-primary" size="lg">
        <Link href="/app/seguranca">Configurar MFA</Link>
      </Button>
    );
  }

  return (
    <form className="ownership-accept-form" onSubmit={acceptTransfer}>
      <label htmlFor={`totp-${transferId}`}>Código MFA</label>
      <input
        autoComplete="one-time-code"
        id={`totp-${transferId}`}
        inputMode="numeric"
        maxLength={6}
        name="totpCode"
        pattern="[0-9]{6}"
        ref={codeInputRef}
        required
      />
      <Button
        className="button button-primary"
        disabled={isSubmitting}
        type="submit"
      >
        <Crown aria-hidden="true" />
        {isSubmitting ? "Aceitando..." : "Aceitar propriedade"}
      </Button>
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
    </form>
  );
}
