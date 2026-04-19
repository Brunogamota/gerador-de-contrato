import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { HardNavLink } from '@/components/ui/HardNavLink';
import { RebornMark } from '@/components/brand/RebornLogo';
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
      <body className="bg-ink-950 text-ink-50">
        <div className="min-h-screen flex flex-col bg-ink-950">
          {/* ── Top navigation (dark branded) ──────────────────── */}
          <header className="bg-ink-900 border-b border-brand/20 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
              {/* Brand */}
              <Link href="/" className="flex items-center gap-2.5 group" aria-label="RebornPay">
                <RebornMark size={28} color="#f72662" />
                <span className="text-white font-bold text-sm tracking-tight">rebornpay</span>
                <span
                  className="hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full ml-1"
                  style={{ background: 'rgba(247,38,98,0.15)', color: '#ff73a2' }}
                >
                  Contratos
                </span>
              </Link>

              {/* Nav links */}
              <nav className="flex items-center gap-1">
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-lg text-sm text-ink-300 hover:text-white hover:bg-ink-800 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/contracts"
                  className="px-3 py-1.5 rounded-lg text-sm text-ink-300 hover:text-white hover:bg-ink-800 transition-colors"
                >
                  Contratos
                </Link>
                <HardNavLink
                  href="/contracts/new"
                  className="ml-3 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#f72662,#771339)', boxShadow: '0 0 12px rgba(247,38,98,0.35)' }}
                >
                  + Novo
                </HardNavLink>
              </nav>
            </div>
          </header>

          {/* ── Page content ───────────────────────────────────── */}
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* ── Footer ─────────────────────────────────────────── */}
          <footer className="border-t border-ink-800 bg-ink-900/50 py-4 mt-4">
            <p className="text-center text-xs text-ink-400">
              © {new Date().getFullYear()} Reborn Tecnologia e Serviços Ltda · CNPJ 59.627.567/0001-35
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
