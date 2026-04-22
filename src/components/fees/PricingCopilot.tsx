'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { PricingBrand, TableInstallment, OverrideMap } from '@/lib/fees/pricingViewModel';
import { fmtRate } from '@/lib/fees/pricingViewModel';

interface CopilotChange {
  brand: PricingBrand;
  inst: TableInstallment;
  oldRate: number;
  newRate: number;
  reason: string;
}

interface CopilotResponse {
  explanation: string;
  bullets: string[];
  impactLines: string[];
  changes: CopilotChange[];
}

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: CopilotResponse;
  timestamp: string;
}

const QUICK_CHIPS = [
  'Quero proteger mais margem no longo prazo',
  'Deixa o Pix mais competitivo',
  'Comparar com perfil Nutra Agressivo',
  'Explicar por que Amex está mais caro',
];

// ── Mock AI response generator ────────────────────────────────────────────────
function generateResponse(message: string): CopilotResponse {
  const msg = message.toLowerCase();

  if (msg.includes('pix')) {
    return {
      explanation: 'Para tornar o Pix mais competitivo, sugiro reduzir a taxa à vista para se aproximar do custo operacional, aumentando volume transacionado.',
      bullets: [
        'Reduzir Pix à vista de 0,69% para 0,59%',
        'Manter margem mínima de 0,09% (acima do custo)',
        'Posicionar abaixo da média do mercado (0,65%)',
      ],
      impactLines: [
        'Volume projetado: +18% em transações Pix',
        'Margem Pix: 0,19% → 0,09%',
        'Receita líquida: -R$ 1.850/mês',
      ],
      changes: [{ brand: 'pix', inst: 1, oldRate: 0.69, newRate: 0.59, reason: 'Competitividade Pix' }],
    };
  }

  if (msg.includes('amex') || msg.includes('american')) {
    return {
      explanation: 'O American Express possui custo de processamento estruturalmente mais alto que Visa e Mastercard, pois opera em modelo diferente (4-party vs 3-party). O spread aplicado é proporcional.',
      bullets: [
        'Custo Amex 1x: 2,47% (vs Visa 1x: 1,97%)',
        'Spread mantido igual: ~1,42% em todas as faixas',
        'Taxa final Amex 1x: 3,89% (mercado: 3,79%–4,29%)',
      ],
      impactLines: [
        'Amex representa ~8% do volume',
        'Margem Amex é a mais alta da tabela',
        'Risco de rejeição baixo neste nível',
      ],
      changes: [],
    };
  }

  if (msg.includes('margem') || msg.includes('longo prazo') || msg.includes('proteg')) {
    return {
      explanation: 'Para proteger margem no longo prazo, recomendo aumentar spreads nas faixas de 9x e 12x, onde o custo de antecipação é maior mas a sensibilidade ao preço é menor.',
      bullets: [
        'Aumentar Visa 9x: 4,29% → 4,49%',
        'Aumentar Visa 12x: 4,99% → 5,19%',
        'Mesma lógica para Mastercard',
        'Manter 1x–6x competitivo',
      ],
      impactLines: [
        'Margem média: 0,42% → 0,52%',
        'Competitividade: mantida (ajuste no longo prazo)',
        'Impacto estimado: +R$ 12.400/mês',
      ],
      changes: [
        { brand: 'visa',       inst: 9,  oldRate: 4.29, newRate: 4.49, reason: 'Proteção de margem longo prazo' },
        { brand: 'visa',       inst: 12, oldRate: 4.99, newRate: 5.19, reason: 'Proteção de margem longo prazo' },
        { brand: 'mastercard', inst: 9,  oldRate: 4.29, newRate: 4.49, reason: 'Proteção de margem longo prazo' },
        { brand: 'mastercard', inst: 12, oldRate: 4.99, newRate: 5.19, reason: 'Proteção de margem longo prazo' },
      ],
    };
  }

  // Default: aggressive strategy for high-volume
  return {
    explanation: 'Entendi! Vou criar uma estratégia mais agressiva focando em volume alto para e-commerce, mantendo sua margem protegida.',
    bullets: [
      'Reduzir taxas em Visa e Mastercard no 1x e 2x',
      'Manter estrutura atual no 3x ao 6x',
      'Ajustar Elo e Amex para compensar no longo prazo',
      'Pix mais competitivo',
    ],
    impactLines: [
      'Margem média: 0,42% → 0,38%',
      'Competitividade: +18%',
      'Volume projetado: +12%',
    ],
    changes: [
      { brand: 'visa',       inst: 1,  oldRate: 2.39, newRate: 2.29, reason: 'Competitividade à vista' },
      { brand: 'visa',       inst: 2,  oldRate: 2.59, newRate: 2.49, reason: 'Competitividade curto prazo' },
      { brand: 'mastercard', inst: 1,  oldRate: 2.39, newRate: 2.29, reason: 'Competitividade à vista' },
      { brand: 'mastercard', inst: 2,  oldRate: 2.59, newRate: 2.49, reason: 'Competitividade curto prazo' },
      { brand: 'pix',        inst: 1,  oldRate: 0.69, newRate: 0.59, reason: 'Pix mais competitivo' },
    ],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  overrides: OverrideMap;
  onApplySuggestion: (changes: CopilotChange[]) => void;
}

export function PricingCopilot({ onApplySuggestion }: Props) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: '0',
      role: 'user',
      text: 'Quero uma estratégia mais agressiva para e-commerce de alto volume, mas sem perder margem.',
      timestamp: '10:30',
    },
    {
      id: '1',
      role: 'assistant',
      text: '',
      response: generateResponse('agressiva e-commerce volume margem'),
      timestamp: '10:30',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<CopilotChange[] | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: CopilotMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(text);
      const assistantMsg: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '',
        response,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1200);
  }

  function handleApply(changes: CopilotChange[]) {
    onApplySuggestion(changes);
    setPendingChanges(null);
  }

  return (
    <aside className="w-[340px] shrink-0 flex flex-col border-l border-white/[0.06] bg-[#0c0c0d]">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,rgba(247,38,98,0.18),rgba(119,19,57,0.18))', border: '1px solid rgba(247,38,98,0.3)' }}>
            <svg className="w-3.5 h-3.5 text-brand" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Pricing Copilot</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand/15 text-brand border border-brand/25 tracking-wider">BETA</span>
            </div>
            <p className="text-[11px] text-white/35 mt-0.5">Seu copiloto inteligente para precificação.</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white leading-snug"
                  style={{ background: 'linear-gradient(135deg,#f72662,#771339)' }}>
                  {msg.text}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg,rgba(247,38,98,0.2),rgba(119,19,57,0.2))', border: '1px solid rgba(247,38,98,0.25)' }}>
                  <svg className="w-3 h-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  {msg.response && (
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3.5 flex flex-col gap-3">
                      <p className="text-sm text-white/80 leading-relaxed">{msg.response.explanation}</p>

                      {msg.response.bullets.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Minha sugestão:</p>
                          <ul className="flex flex-col gap-1">
                            {msg.response.bullets.map((b, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-white/65">
                                <span className="text-brand mt-0.5 shrink-0">•</span>
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {msg.response.impactLines.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Impacto estimado:</p>
                          <ul className="flex flex-col gap-1">
                            {msg.response.impactLines.map((l, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-white/65">
                                <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                                {l}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {msg.response.changes.length > 0 && (
                        <div className="pt-1 border-t border-white/[0.06]">
                          <p className="text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-widest">
                            Deseja aplicar essa estratégia?
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApply(msg.response!.changes)}
                              className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                              style={{ background: 'linear-gradient(135deg,#f72662,#771339)', boxShadow: '0 0 12px rgba(247,38,98,0.25)' }}
                            >
                              Aplicar sugestão
                            </button>
                            <button
                              onClick={() => setShowDetails(showDetails === msg.id ? null : msg.id)}
                              className="px-3 py-2 rounded-xl text-xs font-medium border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
                            >
                              Ver detalhes
                            </button>
                          </div>

                          {showDetails === msg.id && (
                            <div className="mt-3 flex flex-col gap-1.5">
                              {msg.response.changes.map((c, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                                  <span className="text-[10px] font-semibold text-white/40 uppercase">{c.brand} {c.inst}x</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-mono text-white/35">{fmtRate(c.oldRate)}</span>
                                    <span className="text-white/20 text-[10px]">→</span>
                                    <span className="text-[11px] font-mono font-semibold text-emerald-400">{fmtRate(c.newRate)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-white/25 mt-1 ml-1">{msg.timestamp}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(247,38,98,0.2),rgba(119,19,57,0.2))', border: '1px solid rgba(247,38,98,0.25)' }}>
              <svg className="w-3 h-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
            </div>
            <div className="flex items-center gap-1 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div className="px-4 py-3 border-t border-white/[0.06] flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg border border-white/[0.08] text-white/45 hover:text-white/70 hover:border-white/20 hover:bg-white/[0.04] transition-all active:scale-95 text-left"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-5 pt-2">
        <div className="flex items-end gap-2 px-3 py-2.5 rounded-xl border border-white/[0.09] bg-white/[0.03] focus-within:border-white/20 transition-colors">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Digite sua estratégia ou pergunta..."
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 focus:outline-none resize-none leading-snug"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95 shrink-0 disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,#f72662,#771339)' }}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-2 text-center">A IA pode cometer erros. Sempre revise os valores.</p>
      </div>
    </aside>
  );
}
