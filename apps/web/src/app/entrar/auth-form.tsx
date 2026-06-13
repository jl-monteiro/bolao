"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";
type Feedback = {
  message: string;
  type: "error" | "success";
} | null;

type AuthFormProps = {
  emailVerified?: boolean;
  initialMode?: AuthMode;
};

const usesSandboxEmail =
  process.env.NEXT_PUBLIC_EMAIL_DELIVERY !== "resend";

export function AuthForm({
  emailVerified = false,
  initialMode = "sign-in",
}: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [feedback, setFeedback] = useState<Feedback>(
    emailVerified
      ? {
          message: "E-mail confirmado. Agora você pode entrar.",
          type: "success",
        }
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
              message:
                error.message ??
                "Não foi possível criar sua conta. Tente novamente.",
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

    if (!error) {
      router.replace("/app");
      router.refresh();
      return;
    }

    setIsSubmitting(false);
    setFeedback({
      message:
        error.code === "EMAIL_NOT_VERIFIED"
          ? "Confirme seu e-mail antes de entrar."
          : (error.message ??
            "E-mail ou senha inválidos. Confira os dados e tente novamente."),
      type: "error",
    });
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFeedback(null);
    setShowPassword(false);

    const params = new URLSearchParams(window.location.search);
    if (nextMode === "sign-up") {
      params.set("modo", "cadastro");
    } else {
      params.delete("modo");
    }
    params.delete("verificado");

    const query = params.toString();
    router.replace(query ? `/entrar?${query}` : "/entrar", { scroll: false });
  }

  const isSignUp = mode === "sign-up";

  return (
    <div className="auth-panel">
      <div className="auth-panel-header">
        <p>{isSignUp ? "Crie sua conta" : "Bem-vindo de volta"}</p>
        <h2 id="auth-form-title">
          {isSignUp ? "Comece seu primeiro bolão" : "Acesse seus grupos"}
        </h2>
        <span>
          {isSignUp
            ? "Leva menos de 1 minuto."
            : "Use o e-mail confirmado no cadastro."}
        </span>
      </div>

      <form
        aria-busy={isSubmitting}
        aria-labelledby="auth-form-title"
        onSubmit={handleSubmit}
      >
        {isSignUp ? (
          <div className="field">
            <label htmlFor="name">
              Nome <span aria-hidden="true">*</span>
            </label>
            <input
              autoComplete="name"
              id="name"
              name="name"
              required
              type="text"
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="email">
            E-mail <span aria-hidden="true">*</span>
          </label>
          <input
            autoComplete="email"
            id="email"
            inputMode="email"
            name="email"
            required
            spellCheck={false}
            type="email"
          />
        </div>

        <div className="field">
          <label htmlFor="password">
            Senha <span aria-hidden="true">*</span>
          </label>
          <div className="password-control">
            <input
              aria-describedby={isSignUp ? "password-help" : undefined}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              id="password"
              minLength={8}
              name="password"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={
                showPassword
                  ? "Ocultar caracteres da senha"
                  : "Exibir caracteres da senha"
              }
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                {showPassword ? (
                  <>
                    <path d="m3 3 18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 4.2A10.5 10.5 0 0 1 21 12a12 12 0 0 1-2 3.2M6.6 6.6A11.8 11.8 0 0 0 3 12s3.3 6 9 6a9.8 9.8 0 0 0 3-.5" />
                  </>
                ) : (
                  <>
                    <path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {isSignUp ? (
            <span className="field-help" id="password-help">
              Use pelo menos 8 caracteres.
            </span>
          ) : null}
        </div>

        <button
          className="button button-accent button-large auth-submit"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Aguarde…"
            : isSignUp
              ? "Criar minha conta"
              : "Entrar"}
        </button>
      </form>

      {feedback ? (
        <div
          aria-live="polite"
          className={`auth-feedback auth-feedback-${feedback.type}`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            {feedback.type === "success" ? (
              <path d="m5 12 4 4L19 6" />
            ) : (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v6m0 4h.01" />
              </>
            )}
          </svg>
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <p className="auth-switch">
        {isSignUp ? "Já possui conta?" : "Novo por aqui?"}{" "}
        <button
          onClick={() => changeMode(isSignUp ? "sign-in" : "sign-up")}
          type="button"
        >
          {isSignUp ? "Entrar" : "Criar conta"}
        </button>
      </p>
      <p className="security-note">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <rect height="10" rx="2" width="14" x="5" y="10" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        Seus dados trafegam por conexão segura.
      </p>
    </div>
  );
}
