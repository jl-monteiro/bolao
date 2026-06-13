import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGroup,
  getGroupMembers,
  isGroupNotFoundError,
  type GroupRole,
} from "@/lib/groups-api";
import { EditGroupForm } from "./edit-group-form";

const roleLabels: Record<GroupRole, string> = {
  MEMBER: "Membro",
  ORGANIZER: "Organizador",
  OWNER: "Proprietário",
};

type GroupDetailPageProps = {
  params: Promise<{
    groupId: string;
  }>;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

async function loadGroupDetail(groupId: string) {
  try {
    return await Promise.all([
      getGroup(groupId),
      getGroupMembers(groupId),
    ]);
  } catch (error) {
    if (isGroupNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}

export default async function GroupDetailPage({
  params,
}: GroupDetailPageProps) {
  const { groupId } = await params;
  const [group, members] = await loadGroupDetail(groupId);
  const canEdit = group.role === "OWNER" || group.role === "ORGANIZER";

  return (
    <section className="group-detail" aria-labelledby="group-title">
      <Link className="detail-back-link" href="/app">
        <span aria-hidden="true">←</span>
        Voltar aos Grupos
      </Link>

      <div className="group-detail-hero">
        <div className="group-detail-copy">
          <p className="kicker">Detalhe do Grupo</p>
          <div className="group-detail-title-row">
            <h1 id="group-title">{group.name}</h1>
            <span className="role-badge">{roleLabels[group.role]}</span>
          </div>
          <p data-testid="group-description">
            {group.description ??
              "Este Grupo ainda não possui uma descrição."}
          </p>
        </div>
        <div aria-label={`${members.length} membros`} className="member-count">
          <strong>{String(members.length).padStart(2, "0")}</strong>
          <span>{members.length === 1 ? "membro" : "membros"}</span>
        </div>
      </div>

      <div className="group-detail-grid">
        <section
          aria-label="Membros do Grupo"
          className="members-panel"
        >
          <div className="panel-heading">
            <div>
              <p className="kicker">Pessoas</p>
              <h2>Membros do Grupo</h2>
            </div>
            <span>{String(members.length).padStart(2, "0")}</span>
          </div>

          <ul className="member-list">
            {members.map((member) => (
              <li className="member-row" key={member.id}>
                <span aria-hidden="true" className="member-avatar">
                  {getInitials(member.name)}
                </span>
                <div className="member-identity">
                  <strong>{member.name}</strong>
                  <span>
                    Desde{" "}
                    {new Intl.DateTimeFormat("pt-BR", {
                      month: "short",
                      year: "numeric",
                    }).format(new Date(member.joinedAt))}
                  </span>
                </div>
                <span className="member-role">
                  {roleLabels[member.role]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {canEdit ? (
          <EditGroupForm
            description={group.description}
            groupId={group.id}
            name={group.name}
          />
        ) : (
          <aside className="group-read-only">
            <p className="kicker">Seu papel</p>
            <h2>Acesso de leitura</h2>
            <p>
              Membros consultam os dados e participantes do Grupo.
              Alterações ficam disponíveis para Proprietários e
              Organizadores.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
}
