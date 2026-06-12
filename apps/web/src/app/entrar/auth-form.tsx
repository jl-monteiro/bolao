"use client";

import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";
type Feedback = {
  message: string;
  type: "error" | "success";
} | null;

type AuthFormProps = {
  emailVerified?: boolean;
};

const usesSandboxEmail =
  process.env.NEXT_PUBLIC_EMAIL_DELIVERY !== "resend";

export function AuthForm({ emailVerified = false }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [feedback, setFeedback] = useState<Feedback>(
    emailVerified
      ? {
          message: "E-mail confirmado. Agora voce pode entrar.",
          type: "success",
        }
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    if (mode === "sign-up") {
      const name = String(formData.get("name"));
      const { error } = await authClient.signUp.email({
        callbackURL: `${window.location.origin}/entrar?verificado=1`,
        email,
        name,
        password,
      });

      setIsSubmitting(false);
      setFeedback(
        error
          ? {
              message: error.message ?? "Nao foi possivel criar sua conta.",
              type: "error",
            }
          : {
              message: usesSandboxEmail
                ? "Conta criada. No sandbox, abra o link exibido no terminal da API."
                : "Conta criada. Confira seu e-mail para confirmar o acesso.",
              type: "success",
            },
      );
      return;
    }

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    setIsSubmitting(false);
    setFeedback(
      error
        ? {
            message:
              error.code === "EMAIL_NOT_VERIFIED"
                ? "Confirme seu e-mail antes de entrar."
                : (error.message ?? "E-mail ou senha invalidos."),
            type: "error",
          }
        : {
            message: "Login realizado.",
            type: "success",
          },
    );
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFeedback(null);
  }

  const isSignUp = mode === "sign-up";

  return (
    <div className="auth-panel">
      <form onSubmit={handleSubmit}>
        {isSignUp ? (
          <>
            <label htmlFor="name">Nome</label>
            <input
              autoComplete="name"
              id="name"
              name="name"
              required
              type="text"
            />
          </>
        ) : null}

        <label htmlFor="email">E-mail</label>
        <input
          autoComplete="email"
          id="email"
          name="email"
          placeholder="voce@exemplo.com"
          required
          type="email"
        />

        <label htmlFor="password">Senha</label>
        <input
          autoComplete={isSignUp ? "new-password" : "current-password"}
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />

        <button
          className="button button-primary"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Aguarde..."
            : isSignUp
              ? "Criar minha conta"
              : "Entrar"}
        </button>
      </form>

      {feedback ? (
        <p
          className={`auth-feedback auth-feedback-${feedback.type}`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}

      <p className="auth-switch">
        {isSignUp ? "Ja possui conta?" : "Novo por aqui?"}{" "}
        <button
          onClick={() => changeMode(isSignUp ? "sign-in" : "sign-up")}
          type="button"
        >
          {isSignUp ? "Entrar" : "Criar conta"}
        </button>
      </p>
    </div>
  );
}
