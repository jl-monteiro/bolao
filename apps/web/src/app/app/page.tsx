import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { getServerSession } from "@/lib/auth-session";
import {
  getGroups,
  getMyMfaStatus,
  getMyIncomingInvites,
  getMyOwnershipTransfers,
  getMyPendingMemberships,
  type GroupRole,
} from "@/lib/groups-api";
import { CreateGroupForm } from "./create-group-form";
import { MeInboxSection } from "./me-inbox-section";
import { MeOwnershipTransfersSection } from "./me-ownership-transfers-section";
import { MePendingMembershipsSection } from "./me-pending-memberships-section";

const roleLabels: Record<GroupRole, string> = {
  MEMBER: "Membro",
  ORGANIZER: "Organizador",
  OWNER: "Proprietário",
};

type AppPageSearchParams = {
  ativacao?: string | string[];
};

type AppPageProps = {
  searchParams?: Promise<AppPageSearchParams>;
};

export default async function AppPage({ searchParams }: AppPageProps) {
  const [session, params] = await Promise.all([
    getServerSession(),
    searchParams ?? Promise.resolve<AppPageSearchParams>({}),
  ]);

  if (!session) {
    redirect("/entrar");
  }

  const [groups, incomingInvites, pendingMemberships, ownershipTransfers, mfa] =
    await Promise.all([
      getGroups(),
      getMyIncomingInvites(),
      getMyPendingMemberships(),
      getMyOwnershipTransfers(),
      getMyMfaStatus(),
    ]);

  const showPendingHint = pendingMemberships.length > 0;
  const activationCompleted = params.ativacao === "concluida";

  return (
    <section className="app-dashboard" aria-labelledby="groups-title">
      <div className="app-page-heading">
        <div>
          <p className="kicker">Área autenticada</p>
          <h1 id="groups-title">Seus grupos</h1>
          <p>
            Organize as pessoas que vão participar dos seus próximos bolões.
         </p>
       </div>
        <CreateGroupForm />
      </div>

      {activationCompleted ? (
        <Alert className="app-page-feedback" role="status">
          <AlertDescription>
            Associação ativada. O Grupo já aparece na sua lista.
          </AlertDescription>
        </Alert>
      ) : null}

      <MeInboxSection invites={incomingInvites} />
      <MeOwnershipTransfersSection
        mfaEnabled={mfa.totpEnabled}
        transfers={ownershipTransfers}
      />
      <MePendingMembershipsSection memberships={pendingMemberships} />

      {groups.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true" className="empty-state-mark">
            01
         </span>
          <div>
            <h2>Você ainda não participa de nenhum Grupo</h2>
            <p>
              {showPendingHint
                ? "Aguarde a validação de identidade das suas pendências para acessar os Grupos."
                : "Crie o primeiro espaço para reunir seus amigos e preparar os próximos bolões."}
           </p>
         </div>
       </div>
      ) : (
        <div className="group-grid">
          {groups.map((group) => (
            <Link
              aria-label={group.name}
              className="group-card-link"
              href={`/app/grupos/${group.id}`}
              key={group.id}
            >
              <article className="group-card">
                <div className="group-card-meta">
                  <span>{roleLabels[group.role]}</span>
                  <span>
                    {group.description ? "Grupo ativo" : "Sem descrição"}
                 </span>
               </div>
                <h2>{group.name}</h2>
                <p>
                  {group.description ??
                    "Abra o Grupo para consultar seus membros e detalhes."}
               </p>
             </article>
           </Link>
          ))}
       </div>
      )}
   </section>
  );
}
