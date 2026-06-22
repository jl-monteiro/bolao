import type { Metadata } from "next";
import Link from "next/link";
import { parsePasswordResetToken } from "@/lib/password-reset-contract";
import { PasswordResetForm } from "./password-reset-form";

export const metadata: Metadata = {
  title: "Redefinir senha | Bolao",
  description: "Solicite um link ou crie uma nova senha para sua conta Bolao.",
};

type RedefinirSenhaPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    token?: string | string[];
  }>;
};

export default async function RedefinirSenhaPage({
  searchParams,
}: RedefinirSenhaPageProps) {
  const params = await searchParams;
  const token = parsePasswordResetToken(params.token);
  const tokenInvalid = params.error === "INVALID_TOKEN";

  return (
    <>
      <header className="auth-header">
        <Link className="brand" href="/" translate="no">
          BOLAO
        </Link>
        <Link className="back-link" href="/entrar">
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="M16 10H5m4-4-4 4 4 4" />
          </svg>
          Voltar para entrar
        </Link>
      </header>

      <main className="auth-page" id="conteudo">
        <section className="auth-shell" aria-labelledby="reset-title">
          <div className="auth-intro">
            <p className="kicker">Recuperacao segura</p>
            <h1 id="reset-title">Volte para seus grupos.</h1>
            <p className="auth-description">
              O link de redefinicao expira em 1 hora e pode ser usado uma unica
              vez.
            </p>
            <ul className="auth-benefits">
              <li>
                <span aria-hidden="true">01</span>
                Resposta neutra para proteger sua conta.
              </li>
              <li>
                <span aria-hidden="true">02</span>
                Sessoes antigas sao encerradas apos a troca.
              </li>
              <li>
                <span aria-hidden="true">03</span>
                Acesso liberado somente com nova senha valida.
              </li>
            </ul>
          </div>

          <PasswordResetForm
            initialToken={token}
            tokenInvalid={tokenInvalid}
          />
        </section>
      </main>
    </>
  );
}
