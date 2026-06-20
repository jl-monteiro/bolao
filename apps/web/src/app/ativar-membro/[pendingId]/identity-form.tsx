"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { MePendingMembership } from "@/lib/group-invites-contract";
import { initialIdentityActivationFormState } from "@/lib/identity-contract";
import { activateWithIdentity } from "./activate-action";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="identity-submit"
      disabled={pending}
      size="lg"
      type="submit"
    >
      {pending ? "Validando..." : "Validar e ativar"}
    </Button>
  );
}

export function IdentityForm({
  defaultName,
  pendingMembership,
}: {
  defaultName: string;
  pendingMembership: MePendingMembership;
}) {
  const [state, formAction] = useActionState(
    activateWithIdentity.bind(null, pendingMembership.id),
    initialIdentityActivationFormState,
  );
  const formError = state.status === "error" ? state.message : null;

  return (
    <Card className="identity-activation-card animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500">
      <CardHeader className="identity-activation-header">
        <CardDescription className="kicker">
          Validação de identidade
        </CardDescription>
        <CardTitle>
          <h2>{pendingMembership.group.name}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="identity-activation-content">
        <dl className="identity-activation-details">
          <div>
            <dt>Aceito em</dt>
            <dd>
              {dateFormatter.format(new Date(pendingMembership.acceptedAt))}
            </dd>
          </div>
          <div>
            <dt>Prazo da pendência</dt>
            <dd>
              {dateFormatter.format(new Date(pendingMembership.expiresAt))}
            </dd>
          </div>
        </dl>

        <form action={formAction} className="identity-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="identity-full-name">
                Nome completo <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                autoComplete="name"
                defaultValue={defaultName}
                id="identity-full-name"
                maxLength={120}
                minLength={2}
                name="fullName"
                required
                type="text"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="identity-birth-date">
                Data de nascimento <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                autoComplete="bday"
                id="identity-birth-date"
                name="birthDate"
                required
                type="date"
              />
              <FieldDescription>
                É necessário ter 18 anos ou mais.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="identity-cpf">
                CPF <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                autoComplete="off"
                id="identity-cpf"
                inputMode="numeric"
                maxLength={14}
                name="cpf"
                placeholder="000.000.000-00"
                required
                type="text"
              />
              <FieldDescription>
                O CPF é salvo somente com números.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
