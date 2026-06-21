"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/group-invites-contract";
import {
  buildMfaConfirmPath,
  buildMfaSetupPath,
  createConfirmMfaBody,
  isSixDigitCode,
  type MfaSetup,
} from "@/lib/mfa-contract";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Feedback = {
  message: string;
  type: "error" | "success";
} | null;

export function MfaSetupForm() {
  const router = useRouter();
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setup, setSetup] = useState<MfaSetup | null>(null);

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus();
    }
  }, [feedback]);

  async function beginSetup() {
    setFeedback(null);
    setIsSettingUp(true);

    try {
      const response = await fetch(`${apiUrl}${buildMfaSetupPath()}`, {
        credentials: "include",
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setFeedback({
          message: getApiErrorMessage(
            payload,
            "Não foi possível iniciar o MFA. Tente novamente.",
          ),
          type: "error",
        });
        return;
      }

      setSetup((await response.json()) as MfaSetup);
      requestAnimationFrame(() => {
        codeInputRef.current?.focus();
      });
    } catch {
      setFeedback({
        message:
          "Não foi possível conectar ao servidor. Tente novamente em instantes.",
        type: "error",
      });
    } finally {
      setIsSettingUp(false);
    }
  }

  async function confirmSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("code") ?? "").trim();

    if (!isSixDigitCode(code)) {
      setFeedback({
        message: "Informe o código de 6 dígitos do aplicativo autenticador.",
        type: "error",
      });
      codeInputRef.current?.focus();
      return;
    }

    setIsConfirming(true);

    try {
      const response = await fetch(`${apiUrl}${buildMfaConfirmPath()}`, {
        body: JSON.stringify(createConfirmMfaBody(code)),
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
            "Não foi possível confirmar o MFA.",
          ),
          type: "error",
        });
        return;
      }

      setFeedback({
        message: "MFA TOTP ativado.",
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
      setIsConfirming(false);
    }
  }

  return (
    <Card className="security-card">
      <CardHeader>
        <CardDescription className="kicker">MFA TOTP</CardDescription>
        <CardTitle>
          <h2>Autenticador</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="security-card-content">
        {setup ? (
          <form
            aria-busy={isConfirming}
            className="security-mfa-form"
            onSubmit={confirmSetup}
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Chave manual</FieldLabel>
                <code className="secret-code">{setup.secret}</code>
                <FieldDescription>
                  Adicione esta chave em um aplicativo autenticador.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="mfa-code">
                  Código <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  autoComplete="one-time-code"
                  id="mfa-code"
                  inputMode="numeric"
                  maxLength={6}
                  name="code"
                  pattern="[0-9]{6}"
                  ref={codeInputRef}
                  required
                />
              </Field>
            </FieldGroup>

            <Button
              className="button button-primary"
              disabled={isConfirming}
              type="submit"
            >
              <ShieldCheck aria-hidden="true" />
              {isConfirming ? "Confirmando..." : "Verificar e ativar"}
            </Button>
          </form>
        ) : (
          <Button
            className="button button-primary"
            disabled={isSettingUp}
            onClick={beginSetup}
            type="button"
          >
            <ShieldCheck aria-hidden="true" />
            {isSettingUp ? "Gerando..." : "Configurar MFA"}
          </Button>
        )}

        <div aria-live="polite" className="invite-feedback">
          {feedback ? (
            <Alert
              ref={feedbackRef}
              role={feedback.type === "error" ? "alert" : "status"}
              tabIndex={-1}
              variant={feedback.type === "error" ? "destructive" : "default"}
            >
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
