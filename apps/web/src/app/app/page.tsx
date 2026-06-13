import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { getGroups, type GroupRole } from "@/lib/groups-api";
import { CreateGroupForm } from "./create-group-form";

const roleLabels: Record<GroupRole, string> = {
  MEMBER: "Membro",
  ORGANIZER: "Organizador",
  OWNER: "Proprietário",
};

export default async function AppPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/entrar");
  }

  const groups = await getGroups();

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

      {groups.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true" className="empty-state-mark">
            01
          </span>
          <div>
            <h2>Você ainda não participa de nenhum Grupo.</h2>
            <p>
              Crie o primeiro espaço para reunir seus amigos e preparar os
              próximos bolões.
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
