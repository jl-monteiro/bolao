import Link from "next/link";
import {
  getInviteStatusLabel,
  type IncomingGroupInvite,
} from "@/lib/group-invites-contract";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function MeInboxSection({
  invites,
}: {
  invites: IncomingGroupInvite[];
}) {
  if (invites.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="me-inbox-title"
      className="members-panel me-inbox"
    >
      <div className="panel-heading">
        <div>
          <p className="kicker">Caixa de entrada</p>
          <h2 id="me-inbox-title">
            Convites para você ({invites.length})
         </h2>
       </div>
     </div>

      <ul className="invite-list">
        {invites.map((invite) => (
          <li className="invite-row" key={invite.id}>
            <div className="invite-row-main">
              <strong>{invite.group.name}</strong>
              <span
                className={`invite-status invite-status-${invite.status.toLowerCase()}`}
              >
                {getInviteStatusLabel(invite.status)}
             </span>
           </div>
            <dl className="invite-metadata">
              <div>
                <dt>Enviado por</dt>
                <dd>{invite.issuedBy.name}</dd>
             </div>
              <div>
                <dt>Validade</dt>
                <dd>{dateFormatter.format(new Date(invite.expiresAt))}</dd>
             </div>
           </dl>
            <p className="form-help-light">
              Para aceitar, abra o link enviado por e-mail — o convite só
              pode ser consumido por quem recebeu.
           </p>
            <Link
              aria-label={`Abrir detalhes do grupo ${invite.group.name}`}
              className="text-button"
              href={`/app/grupos/${invite.group.id}`}
            >
              Ver grupo
           </Link>
         </li>
        ))}
     </ul>
   </section>
  );
}
