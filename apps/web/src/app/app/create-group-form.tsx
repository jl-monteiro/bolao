"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiError = {
  message?: string | string[];
};

export function CreateGroupForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`${apiUrl}/v1/groups`, {
      body: JSON.stringify({
        description: String(formData.get("description") ?? ""),
        name: String(formData.get("name") ?? ""),
      }),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | ApiError
        | null;
      const message = Array.isArray(payload?.message)
        ? payload.message[0]
        : payload?.message;

      setError(message ?? "Não foi possível criar o Grupo. Tente novamente.");
      setIsSubmitting(false);
      return;
    }

    formRef.current?.reset();
    setIsOpen(false);
    setIsSubmitting(false);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <button
        className="button button-primary button-large"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Criar grupo
      </button>
    );
  }

  return (
    <form
      aria-busy={isSubmitting}
      aria-labelledby="create-group-title"
      className="create-group-form"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div className="create-group-form-heading">
        <div>
          <p className="kicker">Novo Grupo</p>
          <h2 id="create-group-title">Crie o espaço da turma.</h2>
        </div>
        <button
          className="text-button"
          disabled={isSubmitting}
          onClick={() => {
            setError(null);
            setIsOpen(false);
          }}
          type="button"
        >
          Cancelar
        </button>
      </div>

      <div className="create-group-fields">
        <div className="field field-light">
          <label htmlFor="group-name">Nome do Grupo</label>
          <input
            autoFocus
            id="group-name"
            maxLength={80}
            minLength={3}
            name="name"
            required
            type="text"
          />
        </div>
        <div className="field field-light">
          <label htmlFor="group-description">Descrição</label>
          <textarea
            id="group-description"
            maxLength={500}
            name="description"
            rows={3}
          />
        </div>
      </div>

      <div className="create-group-actions">
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : (
          <span />
        )}
        <button
          className="button button-accent button-large"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Criando…" : "Confirmar criação"}
        </button>
      </div>
    </form>
  );
}
