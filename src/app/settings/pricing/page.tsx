'use client';

import { useEffect, useRef, useState } from 'react';
import { MDRMatrix, IntlPricing, DEFAULT_INTL_PRICING } from '@/types/pricing';
import { createEmptyMatrix } from '@/lib/calculations/mdr';
import { validateMatrix } from '@/lib/calculations/validation';
import { MDRGrid } from '@/components/mdr/MDRGrid';
import { PDFImportModal } from '@/components/mdr/PDFImportModal';
import { IntlPricingForm } from '@/components/proposal/steps/IntlPricingForm';
import { cn } from '@/lib/utils';

interface CostProfile {
  id: string;
  name: string;
  mcc: string;
  mdrMatrix: string;
  intlCostPricing: string;
  isDefault: boolean;
  createdAt: string;
}

type Mode = 'list' | 'create' | 'edit';
type Tab = 'brasil' | 'intl';

export default function PricingSettingsPage() {
  const [profiles, setProfiles] = useState<CostProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [mcc, setMcc] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [matrix, setMatrix] = useState<MDRMatrix>(createEmptyMatrix);
  const [intlCostPricing, setIntlCostPricing] = useState<IntlPricing>(DEFAULT_INTL_PRICING);
  const [tab, setTab] = useState<Tab>('brasil');
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [intlAiLoading, setIntlAiLoading] = useState(false);
  const [intlAiError, setIntlAiError] = useState('');
  const intlFileRef = useRef<HTMLInputElement>(null);

  async function loadProfiles() {
    setLoading(true);
    try {
      const res = await fetch('/api/cost-profiles');
      if (res.ok) setProfiles(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProfiles(); }, []);

  function openCreate() {
    setName(''); setMcc(''); setIsDefault(false);
    setMatrix(createEmptyMatrix());
    setIntlCostPricing(DEFAULT_INTL_PRICING);
    setTab('brasil');
    setEditingId(null);
    setMode('create');
  }

  function openEdit(p: CostProfile) {
    setName(p.name); setMcc(p.mcc); setIsDefault(p.isDefault);
    try { setMatrix(JSON.parse(p.mdrMatrix)); } catch { setMatrix(createEmptyMatrix()); }
    try { setIntlCostPricing(JSON.parse(p.intlCostPricing || '{}')); } catch { setIntlCostPricing(DEFAULT_INTL_PRICING); }
    setTab('brasil');
    setEditingId(p.id);
    setMode('edit');
  }

  async function handleIntlAiAnalyze(file: File) {
    setIntlAiLoading(true);
    setIntlAiError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-intl-pricing', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Erro ao analisar com IA.');
      setIntlCostPricing(json.data as IntlPricing);
    } catch (err: unknown) {
      setIntlAiError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setIntlAiLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { alert('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = { name, mcc, isDefault, mdrMatrix: matrix, intlCostPricing };
      const url = editingId ? `/api/cost-profiles/${editingId}` : '/api/cost-profiles';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      await loadProfiles();
      setMode('list');
    } catch {
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar este perfil?')) return;
    await fetch(`/api/cost-profiles/${id}`, { method: 'DELETE' });
    await loadProfiles();
  }

  async function handleSetDefault(id: string) {
    await fetch(`/api/cost-profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    await loadProfiles();
  }

  const validation = validateMatrix(matrix);

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode('list')}
            className="text-sm text-ink-400 hover:text-ink-100 transition-colors"
          >
            ← Voltar
          </button>
          <h1 className="text-xl font-bold text-ink-50">
            {mode === 'create' ? 'Novo Perfil de Custo' : 'Editar Perfil'}
          </h1>
        </div>

        <div className="bg-ink-900 rounded-2xl border border-ink-800 p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wide mb-1.5">
                Nome do Perfil <span className="text-brand">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Varejo Físico, E-commerce, Restaurantes"
                className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wide mb-1.5">
                MCC (código)
              </label>
              <input
                value={mcc}
                onChange={(e) => setMcc(e.target.value)}
                placeholder="Ex: 5411"
                className="w-full rounded-xl border border-ink-700 bg-ink-800 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50"
              />
              <p className="text-xs text-ink-500 mt-1">Usado para carregar automaticamente ao criar proposta</p>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded accent-brand"
            />
            <span className="text-sm text-ink-300">Usar como padrão (carrega quando MCC não tem perfil específico)</span>
          </label>

          {/* Tab selector */}
          <div className="flex gap-1 p-1 rounded-xl bg-ink-800 w-fit">
            {(['brasil', 'intl'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
                  tab === t
                    ? 'bg-ink-950 text-ink-50 shadow'
                    : 'text-ink-400 hover:text-ink-200'
                )}
              >
                {t === 'brasil' ? 'Brasil' : 'Internacional'}
              </button>
            ))}
          </div>

          {tab === 'brasil' ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-200">Tabela de Custo — Brasil (Adquirente)</p>
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand/30 bg-brand-950/30 text-brand text-sm font-semibold hover:bg-brand-950/60 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                  </svg>
                  Importar com IA
                </button>
              </div>
              <MDRGrid matrix={matrix} onChange={setMatrix} issues={validation.issues} />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-semibold text-ink-200">Custo Internacional — Stripe / Radar</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => intlFileRef.current?.click()}
                    disabled={intlAiLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand/30 bg-brand-950/30 text-brand text-sm font-semibold hover:bg-brand-950/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                    </svg>
                    {intlAiLoading ? 'Analisando…' : 'Analisar com IA'}
                  </button>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-950/40 text-red-400 border border-red-800/30">
                    Uso interno — não vai no PDF do cliente
                  </span>
                </div>
              </div>
              <input
                ref={intlFileRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleIntlAiAnalyze(file);
                  e.target.value = '';
                }}
              />
              {intlAiError && (
                <p className="text-xs text-red-400">{intlAiError}</p>
              )}
              <IntlPricingForm value={intlCostPricing} onChange={setIntlCostPricing} />
            </>
          )}

          {showImport && (
            <PDFImportModal
              currentMatrix={matrix}
              onConfirm={(m) => { setMatrix(m); setShowImport(false); }}
              onClose={() => setShowImport(false)}
            />
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setMode('list')}
            className="px-5 py-2.5 rounded-xl border border-ink-700 text-sm font-medium text-ink-300 hover:bg-ink-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? 'Salvando…' : 'Salvar Perfil'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-50">Perfis de Custo</h1>
          <p className="text-sm text-ink-400 mt-1">
            Configure suas tabelas de custo por MCC. Elas são carregadas automaticamente ao criar propostas.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#f72662,#771339)' }}
        >
          + Novo Perfil
        </button>
      </div>

      <div className="bg-ink-900 rounded-2xl border border-ink-800 shadow-card overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center text-ink-400 text-sm">Carregando...</div>
        ) : profiles.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-ink-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-ink-400 text-sm mb-4">Nenhum perfil de custo criado</p>
            <button
              onClick={openCreate}
              className="inline-flex px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg,#f72662,#771339)' }}
            >
              Criar primeiro perfil
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-800/50 text-xs text-ink-400 uppercase tracking-wide border-b border-ink-800">
              <tr>
                <th className="px-6 py-3 text-left">Nome</th>
                <th className="px-6 py-3 text-left">MCC</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {profiles.map((p) => {
                let filled = 0;
                let hasIntl = false;
                try {
                  const m = JSON.parse(p.mdrMatrix) as MDRMatrix;
                  const v = validateMatrix(m);
                  filled = v.stats.reduce((acc, s) => acc + s.filledCount, 0);
                } catch { /* empty */ }
                try {
                  const intl = JSON.parse(p.intlCostPricing || '{}');
                  hasIntl = !!(intl?.processingRate);
                } catch { /* empty */ }

                return (
                  <tr key={p.id} className="hover:bg-ink-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink-50">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-ink-500">{filled}/60 células MDR Brasil</p>
                        {hasIntl && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/30">
                            + Intl
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-ink-300 text-xs bg-ink-800 px-2 py-0.5 rounded-lg">
                        {p.mcc || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.isDefault ? (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/20 text-brand-300">
                          Padrão
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(p.id)}
                          className="text-xs text-ink-500 hover:text-ink-300 transition-colors"
                        >
                          Definir como padrão
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-4">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-sm text-brand hover:text-brand-400 font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
