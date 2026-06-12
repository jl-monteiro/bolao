const features = [
  {
    title: "Crie seu grupo",
    description: "Reuna amigos em uma comunidade privada e persistente.",
  },
  {
    title: "Monte o bolao",
    description: "Escolha jogos da Copa 2026, regras e faixas de premiacao.",
  },
  {
    title: "Palpite e acompanhe",
    description: "Palpites secretos ate cada jogo e ranking atualizado automaticamente.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#">
          BOLAO
        </a>
        <nav aria-label="Navegacao principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#seguranca">Seguranca</a>
          <button className="button button-secondary" type="button">
            Entrar
          </button>
        </nav>
      </header>

      <section className="hero">
        <div className="eyebrow">COPA DO MUNDO 2026</div>
        <h1>Palpite com amigos. Premio sem confusao.</h1>
        <p>
          Organize boloes privados, receba contribuicoes via Pix e acompanhe
          cada resultado com regras transparentes.
        </p>
        <div className="hero-actions">
          <button className="button button-primary" type="button">
            Criar meu grupo
          </button>
          <a className="text-link" href="#como-funciona">
            Ver como funciona
          </a>
        </div>
        <div className="match-card" aria-label="Exemplo de jogo">
          <div>
            <span className="match-label">Proximo jogo</span>
            <strong>Brasil</strong>
          </div>
          <div className="score">
            <span>2</span>
            <small>PALPITE</small>
            <span>1</span>
          </div>
          <div className="match-away">
            <span className="match-label">18 JUN - 16:00</span>
            <strong>Adversario</strong>
          </div>
        </div>
      </section>

      <section className="features" id="como-funciona">
        {features.map((feature, index) => (
          <article key={feature.title}>
            <span>0{index + 1}</span>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="trust" id="seguranca">
        <div>
          <span className="eyebrow">REGRAS CLARAS</span>
          <h2>Resultado oficial. Pagamento rastreavel.</h2>
        </div>
        <p>
          Jogos vem de fonte esportiva integrada. Contribuicoes, reembolsos e
          premios passam pelo Mercado Pago, com validacao em sandbox antes de
          qualquer operacao real.
        </p>
      </section>
    </main>
  );
}
