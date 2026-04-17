import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RebornPay · Gerador de Contratos',
  description: 'Plataforma de contratos e pricing engine para infraestrutura de pagamentos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">R</span>
                </div>
                <span className="font-semibold text-gray-900 text-sm">RebornPay</span>
                <span className="text-gray-300 text-sm">·</span>
                <span className="text-gray-500 text-sm">Contratos</span>
              </a>
              <nav className="flex items-center gap-1">
                <a href="/" className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                  Dashboard
                </a>
                <a href="/contracts" className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                  Contratos
                </a>
                <a href="/contracts/new" className="ml-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                  + Novo Contrato
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-gray-200 bg-white py-4">
            <p className="text-center text-xs text-gray-400">
              © {new Date().getFullYear()} Reborn Tecnologia e Serviços Ltda · CNPJ 59.627.567/0001-35
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
