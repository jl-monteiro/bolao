import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { LogoutButton } from "./logout-button";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  if (!session) {
    redirect("/entrar");
  }

  return (
    <div className="app-frame">
      <header className="app-header">
        <Link className="brand" href="/app" translate="no">
          BOLÃO
        </Link>
        <nav aria-label="Navegação da área autenticada">
          <Link aria-current="page" href="/app">
            Grupos
          </Link>
        </nav>
        <div className="app-account">
          <div className="app-identity">
            <strong>{session.user.name}</strong>
            <span>{session.user.email}</span>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="app-main" id="conteudo">
        {children}
      </main>
    </div>
  );
}
