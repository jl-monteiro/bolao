import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { getSafeInviteReturnPath } from "@/lib/group-invites-contract";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "Entrar | Bolão",
  description: "Entre ou crie sua conta para participar dos seus bolões.",
};

type EntrarPageProps = {
  searchParams: Promise<{
    modo?: string | string[];
    retorno?: string | string[];
    verificado?: string | string[];
  }>;
};

export default async function EntrarPage({ searchParams }: EntrarPageProps) {
  const [params, session] = await Promise.all([
    searchParams,
    getServerSession(),
  ]);
  const returnTo = getSafeInviteReturnPath(params.retorno);

  if (session) {
    redirect(returnTo);
  }

  const emailVerified = params.verificado === "1";
  const initialMode = params.modo === "cadastro" ? "sign-up" : "sign-in";

  return (
    <>
      <header className="auth-header">
        <Link className="brand" href="/" translate="no">
          BOLÃO
        </Link>
        <Link className="back-link" href="/">
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="M16 10H5m4-4-4 4 4 4" />
          </svg>
          Voltar ao Início
        </Link>
      </header>

      <main className="auth-page" id="conteudo">
        <section className="auth-shell" aria-labelledby="auth-title">
          <div className="auth-intro">
            <p className="kicker">Acesso seguro</p>
            <h1 id="auth-title">Entre no seu bolão.</h1>
            <p className="auth-description">
              Acompanhe palpites, ranking e contribuições dos seus grupos em um
              único lugar.
            </p>
            <ul className="auth-benefits">
              <li>
                <span aria-hidden="true">01</span>
                Palpites protegidos até o início de cada jogo.
              </li>
              <li>
                <span aria-hidden="true">02</span>
                Histórico completo de regras e movimentações.
              </li>
              <li>
                <span aria-hidden="true">03</span>
                E-mail confirmado antes do primeiro acesso.
              </li>
            </ul>
          </div>

          <AuthForm
            emailVerified={emailVerified}
            initialMode={initialMode}
            returnTo={returnTo}
          />
        </section>
      </main>
    </>
  );
}
