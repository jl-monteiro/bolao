import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Crie seu grupo",
    description:
      "Reúna os amigos em um espaço privado, com histórico e regras sempre à mão.",
  },
  {
    number: "02",
    title: "Monte o bolão",
    description:
      "Escolha os jogos da Copa 2026, defina a pontuação e organize a premiação.",
  },
  {
    number: "03",
    title: "Palpite e acompanhe",
    description:
      "Os palpites ficam secretos até cada partida. Depois, o ranking se atualiza sozinho.",
  },
];

const safeguards = [
  "Contribuições via Mercado Pago, validadas primeiro em sandbox.",
  "Resultados importados por integração esportiva e registrados no histórico.",
  "Regras, palpites e movimentações disponíveis para conferência.",
];

export default function Home() {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/" translate="no">
          BOLÃO
        </Link>
        <nav aria-label="Navegação principal">
          <a className="nav-section-link" href="#como-funciona">
            Como funciona
          </a>
          <a className="nav-section-link" href="#seguranca">
            Segurança
          </a>
          <Link className="button button-ghost button-small" href="/entrar">
            Entrar
          </Link>
        </nav>
      </header>

      <main id="conteudo">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="kicker">
              <span aria-hidden="true" className="status-dot" />
              Copa do Mundo 2026
            </p>
            <h1 id="hero-title">
              Palpite entre amigos.
              <span> Prêmio sem confusão.</span>
            </h1>
            <p className="hero-description">
              Organize bolões privados, receba contribuições via Pix e acompanhe
              cada resultado com regras transparentes.
            </p>
            <div className="hero-actions">
              <Link
                className="button button-primary button-large"
                href="/entrar?modo=cadastro"
              >
                Criar meu grupo
                <svg aria-hidden="true" viewBox="0 0 20 20">
                  <path d="M4 10h11m-4-4 4 4-4 4" />
                </svg>
              </Link>
              <a className="text-link" href="#como-funciona">
                Ver como funciona
              </a>
            </div>
            <div className="hero-proof" aria-label="Benefícios principais">
              <div aria-hidden="true" className="avatar-stack">
                <span>JL</span>
                <span>AM</span>
                <span>RC</span>
              </div>
              <p>
                <strong>Feito para grupos reais.</strong>
                <span>Sem planilhas, cobranças soltas ou regra escondida.</span>
              </p>
            </div>
          </div>

          <article className="match-card" aria-label="Exemplo de palpite">
            <header className="match-card-header">
              <span>Exemplo de palpite</span>
              <span className="match-status">
                <span aria-hidden="true" />
                Aberto
              </span>
            </header>
            <div className="match-teams">
              <div className="team">
                <span aria-hidden="true" className="team-badge">
                  BRA
                </span>
                <strong>Brasil</strong>
              </div>
              <div className="score" aria-label="Brasil 2, adversário 1">
                <span>2</span>
                <small>SEU PALPITE</small>
                <span>1</span>
              </div>
              <div className="team team-away">
                <span aria-hidden="true" className="team-badge team-badge-away">
                  ADV
                </span>
                <strong>Adversário</strong>
              </div>
            </div>
            <footer className="match-card-footer">
              <span>Fase de grupos · 16h</span>
              <span>Palpite secreto até o início</span>
            </footer>
          </article>
        </section>

        <section
          className="process-section"
          id="como-funciona"
          aria-labelledby="process-title"
        >
          <div className="section-heading">
            <p className="kicker">Do convite ao pódio</p>
            <h2 id="process-title">Tudo resolvido em 3 passos.</h2>
            <p>
              Você cuida da resenha. O Bolão organiza regras, palpites,
              pagamentos e ranking.
            </p>
          </div>

          <ol className="features">
            {features.map((feature) => (
              <li key={feature.title}>
                <span className="feature-number">{feature.number}</span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="trust-section"
          id="seguranca"
          aria-labelledby="trust-title"
        >
          <div className="trust-copy">
            <p className="kicker kicker-inverse">Confiança de ponta a ponta</p>
            <h2 id="trust-title">
              Regra clara.
              <span> Dinheiro rastreável.</span>
            </h2>
            <p>
              Cada etapa deixa registro. Assim, todo mundo sabe o que vale,
              quando vale e como o prêmio será pago.
            </p>
          </div>
          <ul className="safeguards">
            {safeguards.map((safeguard) => (
              <li key={safeguard}>
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="m5 12 4 4L19 6" />
                </svg>
                <span>{safeguard}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="site-footer">
        <Link className="brand" href="/" translate="no">
          BOLÃO
        </Link>
        <p>Palpite com amigos. Regra clara para todo mundo.</p>
        <Link className="text-link" href="/entrar?modo=cadastro">
          Começar agora
        </Link>
      </footer>
    </>
  );
}
