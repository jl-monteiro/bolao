import Link from "next/link";

export default function GroupNotFound() {
  return (
    <section className="group-not-found">
      <p className="kicker">Grupo indisponível</p>
      <h1>Este Grupo não foi encontrado.</h1>
      <p>
        Ele pode não existir ou sua conta pode não participar dele.
      </p>
      <Link className="button button-primary button-large" href="/app">
        Voltar aos Grupos
      </Link>
    </section>
  );
}
