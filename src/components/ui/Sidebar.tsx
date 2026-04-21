'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RebornMark } from '@/components/brand/RebornLogo';
import { cn } from '@/lib/utils';

const NAV = [
  {
    section: 'PRINCIPAL',
    items: [
      { href: '/',           label: 'Dashboard',      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/contracts',  label: 'Contratos',       icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { href: '/proposals',  label: 'Propostas',       icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { href: '/drafts',     label: 'Rascunhos',       icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    ],
  },
  {
    section: 'FERRAMENTAS',
    items: [
      { href: '/settings/pricing', label: 'Pricing Engine', icon: 'M13 10V3L4 14h7v7l9-11h-7z', accent: true },
      { href: '/validations',      label: 'Validações',      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/mdr-analyzer',     label: 'MDR Analyzer',    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href: '/simulators',       label: 'Simuladores',     icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
    ],
  },
  {
    section: 'CONFIGURAÇÕES',
    items: [
      { href: '/settings/fees',       label: 'Taxas e Tarifas', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/settings/brands',     label: 'Bandeiras',        icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
      { href: '/settings/parameters', label: 'Parâmetros',       icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/settings/users',      label: 'Usuários',         icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col bg-[#0f0f0f] border-r border-white/5 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <RebornMark size={24} color="#f72662" />
        <span className="text-white font-bold text-sm tracking-tight">rebornpay</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 flex flex-col gap-6">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase px-2 mb-1.5">
              {group.section}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      active
                        ? item.accent
                          ? 'bg-brand/15 text-brand'
                          : 'bg-white/8 text-white'
                        : item.accent
                          ? 'text-brand/70 hover:bg-brand/10 hover:text-brand'
                          : 'text-white/45 hover:text-white/80 hover:bg-white/5',
                    )}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all">
          <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-brand">RT</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Rafael T.</p>
            <p className="text-[10px] text-white/35 truncate">Administrador</p>
          </div>
          <svg className="w-4 h-4 text-white/25 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
