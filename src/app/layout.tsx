import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/ui/Sidebar';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'RebornPay · Contratos',
  description: 'Plataforma de contratos e pricing engine — RebornPay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable}`}>
      <body className="bg-[#111111] text-white">
        <Sidebar />
        <main className="ml-60 min-h-screen bg-[#111111]">
          <div className="px-8 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
