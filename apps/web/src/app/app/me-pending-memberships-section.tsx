import Link from "next/link";
import {
  getPendingMemberStatusLabel,
  type MePendingMembership,
} from "@/lib/group-invites-contract";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function MePendingMembershipsSection({
  memberships,
}: {
  memberships: MePendingMembership[];
}) {
  if (memberships.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="me-pending-title"
      className="members-panel me-pending"
    >
      <div className="panel-heading">
        <div>
          <p className="kicker">Aguardando validação</p>
          <h2 id="me-pending-title">
            Suas pendências ({memberships.length})
         </h2>
       </div>
     </div>

      <ul className="invite-list">
        {memberships.map((membership) => (
          <li
            className="invite-row pending-member-row"
            key={membership.id}
          >
            <div className="invite-row-main">
              <div className="pending-member-identity">
                <strong>{membership.group.name}</strong>
                <span>Validação de identidade pendente</span>
             </div>
              <span
                className={`invite-status invite-status-${membership.status.toLowerCase()}`}
              >
                {getPendingMemberStatusLabel(membership.status)}
             </span>
           </div>
            <dl className="invite-metadata">
              <div>
                <dt>Aceito em</dt>
                <dd>
                  {dateFormatter.format(new Date(membership.acceptedAt))}
               </dd>
             </div>
              <div>
                <dt>Prazo da pendência</dt>
                <dd>
                  {dateFormatter.format(new Date(membership.expiresAt))}
               </dd>
             </div>
           </dl>
            <p className="form-help-light">
              Sua conta ainda não tem acesso aos dados privados do Grupo.
              Conclua a validação de identidade antes do prazo.
           </p>
            <Link
              aria-label={`Abrir detalhes do grupo ${membership.group.name}`}
              className="text-button"
              href={`/app/grupos/${membership.group.id}`}
            >
              Ver detalhes
           </Link>
         </li>
        ))}
     </ul>
   </section>
  );
}
