import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "Entrar | Bolao",
  description: "Entre ou crie sua conta para participar dos seus boloes.",
};

export default function EntrarPage() {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="brand" href="/">
          BOLAO
        </Link>
        <Link className="text-link" href="/">
          Voltar ao inicio
        </Link>
      </header>

      <section className="auth-shell">
        <div className="auth-intro">
          <span className="eyebrow">ACESSO SEGURO</span>
          <h1>Entre no seu bolao</h1>
          <p>
            Acompanhe palpites, ranking e contribuicoes dos seus grupos em um
            unico lugar.
          </p>
          <p className="auth-notice">
            Voce precisara confirmar seu e-mail antes de entrar.
          </p>
        </div>

        <AuthForm />
      </section>
    </main>
  );
}
