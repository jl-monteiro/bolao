import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-archivo",
});

const ibmPlexMono = IBM_Plex_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Bolão",
  description:
    "Palpites entre amigos, com regras claras e premiação transparente.",
};

export const viewport: Viewport = {
  themeColor: "#f2efe6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="pt-BR">
      <body className={`${archivo.variable} ${ibmPlexMono.variable}`}>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
