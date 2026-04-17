'use client';

import { useState, useRef, useCallback, Fragment } from 'react';
import { MDRMatrix, BRANDS, BRAND_LABELS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix } from '@/lib/calculations/mdr';
import { cn } from '@/lib/utils';

type ImportStep = 'upload' | 'processing' | 'review' | 'error';

interface ParsedResult {
  matrix: MDRMatrix;
  fees: Record<string, string>;
  confidence: 'high' | 'medium' | 'low';
  missingData: string[];
}

interface PDFImportModalProps {
  currentMatrix: MDRMatrix;
  onConfirm: (matrix: MDRMatrix) => void;
  onClose: () => void;
}

const CONFIDENCE_LABEL = {
  high:   { label: 'Alta confiança',   color: 'text-emerald-600 bg-emerald-50' },
  medium: { label: 'Confiança média',  color: 'text-amber-600 bg-amber-50' },
  low:    { label: 'Baixa confiança',  color: 'text-red-600 bg-red-50' },
};

export function PDFImportModal({ currentMatrix, onConfirm, onClose }: PDFImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [editMatrix, setEditMatrix] = useState<MDRMatrix>(createEmptyMatrix());
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);
  const [overwriteAll, setOverwriteAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  async function handleAnalyze() {
    if (!file) return;
    setStep('processing');
    setErrorMsg('');

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/parse-pdf', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Erro ao processar o arquivo.');
        setStep('error');
        return;
      }

      setParsed(data);
      setEditMatrix(data.matrix);
      setStep('review');
    } catch {
      setErrorMsg('Falha de conexão ao processar o arquivo. Tente novamente.');
      setStep('error');
    }
  }

  function handleConfirm() {
    if (!parsed) return;
    if (overwriteAll) {
      onConfirm(editMatrix);
    } else {
      // Merge: only fill empty cells in current matrix
      const merged = { ...currentMatrix } as MDRMatrix;
      for (const brand of BRANDS) {
        for (const inst of INSTALLMENTS) {
          const existing = currentMatrix[brand][inst as InstallmentNumber];
          const incoming = editMatrix[brand][inst as InstallmentNumber];
          if (!existing.finalMdr && incoming.finalMdr) {
            merged[brand] = { ...merged[brand], [inst]: incoming };
          }
        }
      }
      onConfirm(merged);
    }
  }

  function updateCell(brand: BrandName, inst: number, field: 'mdrBase' | 'anticipationRate', value: string) {
    setEditMatrix(prev => {
      const entry = { ...prev[brand][inst as InstallmentNumber] };
      entry[field] = value;
      // Recompute final
      const base = parseFloat(entry.mdrBase || '0');
      const ant = parseFloat(entry.anticipationRate || '0');
      entry.finalMdr = (!isNaN(base) ? (base + ant).toFixed(4) : '');
      return { ...prev, [brand]: { ...prev[brand], [inst]: entry } };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(22,20,25,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            <h2 className="text-base font-semibold text-ink-950">Importar Proposta Comercial</h2>
            <p className="text-xs text-ink-500 mt-0.5">Upload de PDF ou imagem → extração por IA → preenchimento automático</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-ink-100 px-6 py-2 gap-6">
          {(['upload', 'processing', 'review'] as const).map((s, i) => (
            <div key={s} className={cn('flex items-center gap-1.5 text-xs font-medium', step === s ? 'text-brand' : 'text-ink-400')}>
              <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold', step === s ? 'bg-brand text-white' : i < ['upload','processing','review'].indexOf(step) ? 'bg-emerald-500 text-white' : 'bg-ink-100 text-ink-500')}>
                {i < ['upload','processing','review'].indexOf(step) ? '✓' : i + 1}
              </span>
              {s === 'upload' ? 'Upload' : s === 'processing' ? 'Processando' : 'Revisão'}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP: upload */}
          {step === 'upload' && (
            <div className="flex flex-col gap-5">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                  dragging ? 'border-brand bg-brand-50' : 'border-ink-200 bg-ink-50 hover:border-brand/50 hover:bg-brand-50/50'
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-ink-800 mb-1">
                  {dragging ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
                </p>
                <p className="text-xs text-ink-500">PDF, PNG ou JPG · max 20 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 bg-ink-50">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-brand" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{file.name}</p>
                    <p className="text-xs text-ink-500">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => { setFile(null); setPreview(null); }} className="text-ink-400 hover:text-ink-700 p-1">✕</button>
                </div>
              )}

              {preview && (
                <img src={preview} alt="Preview" className="rounded-xl border border-ink-200 max-h-48 object-contain w-full bg-ink-50" />
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-800 mb-1">Como funciona a extração por IA</p>
                <p className="text-xs text-amber-700">
                  O sistema usa visão computacional + Claude para identificar tabelas de MDR, taxas por bandeira, parcelamentos e antecipação.
                  Você poderá revisar e corrigir todos os valores antes de confirmar.
                </p>
              </div>
            </div>
          )}

          {/* STEP: processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
                <div className="absolute inset-0 rounded-full border-4 border-brand border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-ink-900 mb-1">Analisando proposta…</p>
                <p className="text-xs text-ink-500">Extração de MDR, taxas e bandeiras via IA</p>
              </div>
            </div>
          )}

          {/* STEP: review */}
          {step === 'review' && parsed && (
            <div className="flex flex-col gap-5">
              {/* Confidence + missing data */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', CONFIDENCE_LABEL[parsed.confidence].color)}>
                  {CONFIDENCE_LABEL[parsed.confidence].label}
                </span>
                {parsed.missingData.length > 0 && (
                  <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full ring-1 ring-amber-200">
                    ⚠ Dados não encontrados: {parsed.missingData.slice(0, 3).join(', ')}
                    {parsed.missingData.length > 3 && ` +${parsed.missingData.length - 3}`}
                  </span>
                )}
              </div>

              <p className="text-xs text-ink-500 -mt-2">Revise e edite os valores extraídos antes de confirmar. Células em amarelo tiveram baixa confiança na extração.</p>

              {/* MDR table per brand */}
              <div className="overflow-x-auto rounded-xl border border-ink-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-ink-50 border-b border-ink-200">
                      <th className="px-3 py-2 text-left font-semibold text-ink-600">Parc.</th>
                      {BRANDS.map(b => (
                        <th key={b} colSpan={2} className="px-2 py-2 text-center font-semibold text-ink-700">
                          {BRAND_LABELS[b]}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-ink-50/50 border-b border-ink-100 text-ink-500">
                      <th className="px-3 py-1" />
                      {BRANDS.map(b => (
                        <Fragment key={b}>
                          <th className="px-2 py-1 text-center font-normal">Base</th>
                          <th className="px-2 py-1 text-center font-normal">Ant.</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {INSTALLMENTS.map(inst => (
                      <tr key={inst} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50">
                        <td className="px-3 py-1.5 font-semibold text-ink-700">{inst}x</td>
                        {BRANDS.map(b => {
                          const entry = editMatrix[b][inst as InstallmentNumber];
                          const hasValue = !!entry.mdrBase;
                          return (
                            <Fragment key={b}>
                              <td className="px-1 py-1">
                                <input
                                  type="text"
                                  value={entry.mdrBase}
                                  onChange={e => updateCell(b, inst, 'mdrBase', e.target.value)}
                                  className={cn(
                                    'w-14 text-center rounded-lg border px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand',
                                    hasValue ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-ink-200 bg-white text-ink-500'
                                  )}
                                  placeholder="—"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  type="text"
                                  value={entry.anticipationRate}
                                  onChange={e => updateCell(b, inst, 'anticipationRate', e.target.value)}
                                  className="w-14 text-center rounded-lg border border-ink-200 bg-white px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand text-ink-600"
                                  placeholder="0"
                                />
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Overwrite option */}
              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-ink-200 hover:bg-ink-50 transition-colors">
                <input
                  type="checkbox"
                  checked={overwriteAll}
                  onChange={e => setOverwriteAll(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand"
                />
                <div>
                  <p className="text-sm font-medium text-ink-800">Substituir tabela inteira</p>
                  <p className="text-xs text-ink-500">Desmarcado: preenche apenas células vazias (recomendado)</p>
                </div>
              </label>
            </div>
          )}

          {/* STEP: error */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-ink-900 mb-1">Falha na extração</p>
                <p className="text-xs text-ink-500 max-w-sm">{errorMsg}</p>
              </div>
              <button onClick={() => setStep('upload')} className="px-4 py-2 rounded-xl bg-ink-900 text-white text-sm font-medium hover:bg-ink-800">
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-ink-100 bg-ink-50/50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-ink-200 bg-white text-sm font-medium text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <div className="flex gap-2">
            {step === 'upload' && (
              <button
                onClick={handleAnalyze}
                disabled={!file}
                className={cn(
                  'px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all',
                  file
                    ? 'bg-brand hover:bg-brand-400 shadow-sm'
                    : 'bg-ink-200 text-ink-500 cursor-not-allowed'
                )}
              >
                Analisar com IA →
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleConfirm}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-400 shadow-sm"
              >
                Confirmar e preencher tabela
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
