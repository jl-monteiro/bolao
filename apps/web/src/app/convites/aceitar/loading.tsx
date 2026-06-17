export default function AcceptInviteLoading() {
  return (
    <main className="invite-accept-page" id="conteudo">
      <section className="invite-accept-shell">
        <div className="invite-accept-intro" aria-hidden="true">
          <div className="page-skeleton page-skeleton-kicker" />
          <div className="page-skeleton page-skeleton-title" />
          <div className="page-skeleton page-skeleton-copy" />
        </div>
        <article aria-busy="true" className="invite-accept-card">
          <div aria-hidden="true" className="invite-card-skeleton">
            <span />
            <span />
            <span />
          </div>
          <span className="sr-only">Carregando convite.</span>
        </article>
      </section>
    </main>
  );
}
