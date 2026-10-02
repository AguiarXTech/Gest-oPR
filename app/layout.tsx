import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Gestão RPortugues',
  description: 'Viagens, abastecimentos, acertos e resultado da frota',
  // App instalado no iPhone: abre em tela cheia, com o grafite por baixo da barra de status
  // (os topos das telas somam env(safe-area-inset-top) para o conteúdo não ficar embaixo dela).
  appleWebApp: { capable: true, title: 'RPortugues', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Barra do navegador no celular no mesmo grafite da tela de login.
  themeColor: '#13171a',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
