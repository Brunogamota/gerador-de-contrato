import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-6xl font-bold text-white/10">404</p>
      <h1 className="text-xl font-semibold text-white/70">Página não encontrada</h1>
      <p className="text-sm text-white/40">Esta página ainda não existe ou foi removida.</p>
      <Link href="/" className="mt-2 px-4 py-2 rounded-xl text-sm font-medium text-white/70 border border-white/10 hover:border-white/20 hover:text-white transition-all">
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
