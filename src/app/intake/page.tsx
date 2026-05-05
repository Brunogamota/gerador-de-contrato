'use client';

import { useState } from 'react';
import { generateIntakeDocx } from '@/lib/intake/generateIntakeDocx';

const SECTIONS = [
  { icon: '🏢', title: 'Dados da Empresa', desc: 'Razão social, EIN/VAT, MCC, mercados de atuação' },
  { icon: '📊', title: 'Volume de Processamento', desc: 'Mensal USD/EUR/BRL, ticket médio, mix CNP/CP, 3DS, recorrente' },
  { icon: '🇺🇸', title: 'MDR Atual — EUA', desc: 'Visa, MC, Amex, Discover · crédito e débito · doméstico e internacional' },
  { icon: '🇪🇺', title: 'MDR Atual — Europa', desc: 'Visa, MC, Amex, UnionPay · doméstico UE, intra-UE, não-UE' },
  { icon: '💸', title: 'Outros Fees', desc: 'Antifraude, 3DS, chargeback, gateway, FX, rolling reserve e mais 8 itens' },
  { icon: '⚠️', title: 'Risco & Prazo', desc: 'Taxa de chargeback, fraude, aprovação, prazo atual, nível de risco' },
  { icon: '🏦', title: 'Dados de Liquidação', desc: 'Conta USD (ABA/Routing) e EUR (IBAN/BIC), moeda e frequência preferencial' },
  { icon: '⚙️', title: 'Integração Técnica', desc: 'Stack, tipo de integração, funcionalidades necessárias, prazo go-live' },
];

export default function IntakePage() {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const blob = await generateIntakeDocx();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RebornPay_Intake_Internacional_${new Date().getFullYear()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar DOCX:', err);
      alert('Erro ao gerar o documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Formulário de Intake Internacional</h1>
            <p className="text-sm text-white/40">Gere o DOCX e envie ao cliente para coletar dados antes da proposta</p>
          </div>
        </div>
      </div>

      {/* Download card */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1">
          <p className="text-white font-semibold mb-1">Documento Word (.docx)</p>
          <p className="text-sm text-white/50">
            Formulário completo para coleta de informações de empresas que processam pagamentos nos <strong className="text-white/70">EUA</strong> e na <strong className="text-white/70">Europa</strong>.
            O cliente preenche e devolve por e-mail.
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#f72662,#771339)', boxShadow: '0 0 20px rgba(247,38,98,0.3)' }}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Gerando…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Baixar DOCX
            </>
          )}
        </button>
      </div>

      {/* Sections preview */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">O que o formulário contém</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map((s) => (
            <div key={s.title} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-xl flex-shrink-0 mt-0.5">{s.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white/80">{s.title}</p>
                <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-5 text-sm text-amber-200/70">
        <p className="font-semibold text-amber-300 mb-2">Como usar</p>
        <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
          <li>Clique em <strong className="text-amber-200">"Baixar DOCX"</strong> — o arquivo será salvo no seu computador.</li>
          <li>Abra no <strong className="text-amber-200">Microsoft Word</strong> ou Google Docs e confira se tudo está correto.</li>
          <li>Envie por e-mail ao cliente pedindo que preencha os campos em branco.</li>
          <li>Com o formulário devolvido, crie uma nova proposta em <strong className="text-amber-200">Propostas → Nova (Internacional)</strong> usando os dados recebidos.</li>
        </ol>
      </div>
    </div>
  );
}
