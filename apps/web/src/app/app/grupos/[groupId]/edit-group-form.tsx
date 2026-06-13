"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiError = {
  message?: string | string[];
};

type EditGroupFormProps = {
  description: string | null;
  groupId: string;
  name: string;
};

export function EditGroupForm({
  description,
  groupId,
  name,
}: EditGroupFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`${apiUrl}/v1/groups/${groupId}`, {
      body: JSON.stringify({
        description: String(formData.get("description") ?? ""),
        name: String(formData.get("name") ?? ""),
      }),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | ApiError
        | null;
      const message = Array.isArray(payload?.message)
        ? payload.message[0]
        : payload?.message;

      setError(
        message ?? "Não foi possível atualizar o Grupo. Tente novamente.",
      );
      setIsSubmitting(false);
      return;
    }

    setSuccess("Alterações salvas.");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form
      aria-busy={isSubmitting}
      className="group-edit-form"
      onSubmit={handleSubmit}
    >
      <div>
        <p className="kicker">Administração</p>
        <h2>Dados do Grupo</h2>
        <p>Nome e descrição ficam visíveis para todos os Membros.</p>
      </div>

      <div className="group-edit-fields">
        <div className="field field-light">
          <label htmlFor="edit-group-name">Nome do Grupo</label>
          <input
            defaultValue={name}
            id="edit-group-name"
            maxLength={80}
            minLength={3}
            name="name"
            required
            type="text"
          />
        </div>
        <div className="field field-light">
          <label htmlFor="edit-group-description">
            Descrição do Grupo
          </label>
          <textarea
            defaultValue={description ?? ""}
            id="edit-group-description"
            maxLength={500}
            name="description"
            rows={5}
          />
        </div>
      </div>

      <div className="group-edit-actions">
        <div aria-live="polite">
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="form-success" role="status">
              {success}
            </p>
          ) : null}
        </div>
        <button
          className="button button-accent button-large"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
