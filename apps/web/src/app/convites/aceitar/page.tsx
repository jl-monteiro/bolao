import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "@/lib/auth-session";
import { AcceptInviteCard } from "./accept-invite-card";

export const metadata: Metadata = {
  title: "Aceitar convite | Bolão",
  description: "Revise e aceite um convite para participar de um Grupo.",
};

export default async function AcceptInvitePage() {
  const session = await getServerSession();

  return (
    <>
      <header className="auth-header">
        <Link className="brand" href="/" translate="no">
          BOLÃO
        </Link>
        <Link className="back-link" href={session ? "/app" : "/"}>
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="M16 10H5m4-4-4 4 4 4" />
          </svg>
          {session ? "Voltar aos Grupos" : "Voltar ao Início"}
        </Link>
      </header>

      <main className="invite-accept-page" id="conteudo">
        <section
          aria-labelledby="invite-accept-title"
          className="invite-accept-shell"
        >
          <div className="invite-accept-intro">
            <p className="kicker">Convite de Grupo</p>
            <h1 id="invite-accept-title">Revise antes de aceitar.</h1>
            <p>
              O convite é pessoal. Os dados do Grupo só aparecem após a
              autenticação e a validação da conta destinatária.
            </p>
          </div>

          <AcceptInviteCard isAuthenticated={Boolean(session)} />
        </section>
      </main>
    </>
  );
}
