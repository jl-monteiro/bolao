import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getMyMfaStatus } from "@/lib/groups-api";
import { MfaSetupForm } from "./mfa-setup-form";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function SecurityPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/entrar");
  }

  const status = await getMyMfaStatus();

  return (
    <section className="security-page" aria-labelledby="security-title">
      <Link className="detail-back-link" href="/app">
        <span aria-hidden="true">←</span>
        Voltar
      </Link>

      <div className="app-page-heading">
        <div>
          <p className="kicker">Segurança</p>
          <h1 id="security-title">MFA da conta</h1>
        </div>
        <Badge variant={status.totpEnabled ? "default" : "secondary"}>
          {status.totpEnabled ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      {status.totpEnabled ? (
        <Alert role="status">
          <AlertDescription>
            MFA TOTP ativo
            {status.enabledAt
              ? ` desde ${dateFormatter.format(new Date(status.enabledAt))}.`
              : "."}
          </AlertDescription>
        </Alert>
      ) : (
        <MfaSetupForm />
      )}
    </section>
  );
}
