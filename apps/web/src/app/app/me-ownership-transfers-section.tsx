import { Badge } from "@/components/ui/badge";
import {
  getOwnershipTransferStatusLabel,
  type OwnershipTransfer,
} from "@/lib/ownership-transfer-contract";
import { OwnershipTransferAcceptAction } from "./ownership-transfer-accept-action";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function MeOwnershipTransfersSection({
  mfaEnabled,
  transfers,
}: {
  mfaEnabled: boolean;
  transfers: OwnershipTransfer[];
}) {
  if (transfers.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="me-ownership-title"
      className="members-panel me-ownership-transfers"
    >
      <div className="panel-heading">
        <div>
          <p className="kicker">Propriedade</p>
          <h2 id="me-ownership-title">
            Transferências para você ({transfers.length})
          </h2>
        </div>
      </div>

      <ul className="invite-list">
        {transfers.map((transfer) => (
          <li className="invite-row" key={transfer.id}>
            <div className="invite-row-main">
              <div className="pending-member-identity">
                <strong>{transfer.group.name}</strong>
                <span>
                  Solicitada por {transfer.currentOwnerMembership.user.name}
                </span>
              </div>
              <Badge variant="secondary">
                {getOwnershipTransferStatusLabel(transfer.status)}
              </Badge>
            </div>
            <dl className="invite-metadata">
              <div>
                <dt>Solicitada</dt>
                <dd>
                  {dateFormatter.format(new Date(transfer.requestedAt))}
                </dd>
              </div>
              <div>
                <dt>Validade</dt>
                <dd>
                  {dateFormatter.format(new Date(transfer.expiresAt))}
                </dd>
              </div>
            </dl>
            <OwnershipTransferAcceptAction
              mfaEnabled={mfaEnabled}
              transferId={transfer.id}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
