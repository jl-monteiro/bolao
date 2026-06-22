"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { authClient } from "@/lib/auth-client";
import {
  getPasswordResetApiErrorMessage,
  getPasswordResetRedirectTo,
  getPasswordResetRequestMessage,
} from "@/lib/password-reset-contract";

type Feedback = {
  message: string;
  title: string;
  type: "error" | "success";
} | null;

type PasswordResetFormProps = {
  initialToken: string | null;
  tokenInvalid?: boolean;
};

const usesSandboxEmail =
  process.env.NEXT_PUBLIC_EMAIL_DELIVERY !== "resend";
const networkErrorMessage =
  "Nao foi possivel conectar ao servidor. Confirme se a API esta em execucao e tente novamente.";

export function PasswordResetForm({
  initialToken,
  tokenInvalid = false,
}: PasswordResetFormProps) {
  const [feedback, setFeedback] = useState<Feedback>(
    tokenInvalid
      ? {
          message: "Solicite um novo link para continuar.",
          title: "Link invalido ou expirado",
          type: "error",
        }
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const hasToken = Boolean(initialToken);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));

    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: getPasswordResetRedirectTo(window.location.origin),
      });

      setFeedback(
        error
          ? {
              message: getPasswordResetApiErrorMessage(
                error,
                "Nao foi possivel enviar o link. Tente novamente.",
              ),
              title: "Falha no envio",
              type: "error",
            }
          : {
              message: getPasswordResetRequestMessage(usesSandboxEmail),
              title: "Verifique seu e-mail",
              type: "success",
            },
      );
    } catch {
      setFeedback({
        message: networkErrorMessage,
        title: "Servidor indisponivel",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!initialToken) {
      setFeedback({
        message: "Solicite um novo link para continuar.",
        title: "Link invalido ou expirado",
        type: "error",
      });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (newPassword !== confirmPassword) {
      setFeedback({
        message: "As senhas informadas precisam ser iguais.",
        title: "Confira a senha",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword,
        token: initialToken,
      });

      if (error) {
        setFeedback({
          message: getPasswordResetApiErrorMessage(
            error,
            "Nao foi possivel redefinir a senha. Solicite um novo link.",
          ),
          title: "Falha na redefinicao",
          type: "error",
        });
        return;
      }

      setResetComplete(true);
      setFeedback({
        message: "Entre novamente usando sua nova senha.",
        title: "Senha redefinida",
        type: "success",
      });
    } catch {
      setFeedback({
        message: networkErrorMessage,
        title: "Servidor indisponivel",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="reset-card animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CardHeader>
        <div className="reset-card-icon" aria-hidden="true">
          {hasToken ? <KeyRound /> : <Mail />}
        </div>
        <CardTitle>
          <h2 className="reset-card-title">
            {hasToken ? "Crie uma nova senha" : "Recupere seu acesso"}
          </h2>
        </CardTitle>
        <CardDescription>
          {hasToken
            ? "Use pelo menos 8 caracteres para proteger sua conta."
            : "Informe o e-mail cadastrado para receber um link seguro."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {hasToken ? (
          <form
            aria-busy={isSubmitting}
            className="reset-form"
            onSubmit={resetPassword}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="newPassword">Nova senha</FieldLabel>
                <div className="reset-password-control">
                  <Input
                    autoComplete="new-password"
                    id="newPassword"
                    minLength={8}
                    name="newPassword"
                    required
                    type={showPassword ? "text" : "password"}
                  />
                  <Button
                    aria-label={
                      showPassword
                        ? "Ocultar caracteres da senha"
                        : "Exibir caracteres da senha"
                    }
                    className="reset-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                <FieldDescription>
                  A nova senha substitui a anterior imediatamente.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirmar senha
                </FieldLabel>
                <Input
                  autoComplete="new-password"
                  id="confirmPassword"
                  minLength={8}
                  name="confirmPassword"
                  required
                  type={showPassword ? "text" : "password"}
                />
              </Field>
            </FieldGroup>

            <Button
              className="reset-submit"
              disabled={isSubmitting || resetComplete}
              type="submit"
            >
              {isSubmitting ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </form>
        ) : (
          <form
            aria-busy={isSubmitting}
            className="reset-form"
            onSubmit={requestReset}
          >
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                autoComplete="email"
                id="email"
                inputMode="email"
                name="email"
                required
                spellCheck={false}
                type="email"
              />
              <FieldDescription>
                A resposta nao confirma se a conta existe.
              </FieldDescription>
            </Field>

            <Button
              className="reset-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Enviando..." : "Enviar link de redefinicao"}
            </Button>
          </form>
        )}

        {feedback ? (
          <Alert
            className="reset-feedback"
            role={feedback.type === "error" ? "alert" : "status"}
            variant={feedback.type === "error" ? "destructive" : "default"}
          >
            {feedback.type === "error" ? <AlertCircle /> : <CheckCircle2 />}
            <AlertTitle>{feedback.title}</AlertTitle>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter>
        <Button asChild className="reset-secondary-action" variant="outline">
          <Link href="/entrar">Voltar para entrar</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
