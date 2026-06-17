"use client";

export default function AcceptInviteError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="invite-accept-page" id="conteudo">
      <section className="invite-accept-shell">
        <div className="invite-accept-intro">
          <p className="kicker">Falha inesperada</p>
          <h1>Não foi possível abrir o convite.</h1>
          <p>Nenhuma alteração foi feita. Tente carregar a página novamente.</p>
        </div>
        <article className="invite-accept-card">
          <h2>Tente novamente</h2>
          <p>
            Se o problema continuar, solicite um novo convite ao responsável
            pelo Grupo.
          </p>
          <button
            className="button button-primary button-large"
            onClick={reset}
            type="button"
          >
            Recarregar convite
          </button>
        </article>
      </section>
    </main>
  );
}
