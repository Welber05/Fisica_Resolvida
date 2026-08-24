import type { Metadata } from 'next';
import './globals.css';
import './management.css';
import './landing.css';

const title = 'Física Resolvida — Acervo ITA e IME';
const description =
  'Pratique com 625 questões oficiais de Física do ITA e do IME, gabaritos conferidos, páginas originais, roteiros de vídeo e gerador de provas.';
const origin = 'https://fisica-resolvida-welber.welber05.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title,
  description,
  openGraph: { title, description, images: [`${origin}/og.png`] },
  twitter: { card: 'summary_large_image', title, description, images: [`${origin}/og.png`] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
