import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerSession } from "@/lib/auth-session";
import { getMyPendingMemberships } from "@/lib/groups-api";
import { buildMemberActivationPath } from "@/lib/identity-contract";
import { IdentityForm } from "./identity-form";

export const metadata: Metadata = {
  title: "Ativar membro | Bolão",
  description: "Valide sua identidade para ativar uma associação pendente.",
};

type ActivateMemberPageProps = {
  params: Promise<{
    pendingId: string;
  }>;
};

export default async function ActivateMemberPage({
  params,
}: ActivateMemberPageProps) {
  const { pendingId } = await params;
  const activationPath = buildMemberActivationPath(pendingId);
  const session = await getServerSession();

  if (!session) {
    redirect(`/entrar?retorno=${encodeURIComponent(activationPath)}`);
  }

  const pendingMemberships = await getMyPendingMemberships();
  const pendingMembership = pendingMemberships.find(
    (membership) => membership.id === pendingId,
  );

  return (
    <>
      <header className="auth-header">
        <Link className="brand" href="/app" translate="no">
          BOLÃO
        </Link>
        <Button asChild className="back-link" size="sm" variant="ghost">
          <Link href="/app">
            <ArrowLeftIcon data-icon="inline-start" />
            Voltar aos Grupos
          </Link>
        </Button>
      </header>

      <main className="invite-accept-page" id="conteudo">
        <section
          aria-labelledby="member-activation-title"
          className="invite-accept-shell"
        >
          <div className="invite-accept-intro animate-in fade-in-0 slide-in-from-left-4 duration-500">
            <p className="kicker">Ativação de membro</p>
            <h1 id="member-activation-title">Complete sua entrada.</h1>
            <p>
              A associação pendente só vira acesso ao Grupo depois da validação
              de identidade da própria conta convidada.
            </p>
          </div>

          {pendingMembership ? (
            <IdentityForm
              defaultName={session.user.name ?? ""}
              pendingMembership={pendingMembership}
            />
          ) : (
            <Card className="identity-activation-card animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500">
              <CardHeader>
                <CardDescription className="kicker">
                  Pendência indisponível
                </CardDescription>
                <CardTitle>
                  <h2>Não encontramos esta ativação</h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="identity-activation-content">
                <p>
                  Ela pode ter expirado, já ter sido ativada ou pertencer a
                  outra conta. Nenhuma alteração foi feita.
                </p>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/app">Voltar aos meus Grupos</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </>
  );
}
