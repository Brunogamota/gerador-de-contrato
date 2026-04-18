'use client';

import { useState, useRef, useCallback, Fragment } from 'react';
import { MDRMatrix, BRANDS, BRAND_LABELS, INSTALLMENTS, BrandName, InstallmentNumber } from '@/types/pricing';
import { createEmptyMatrix } from '@/lib/calculations/mdr';
import { cn } from '@/lib/utils';

type ImportStep = 'upload' | 'processing' | 'review' | 'error';

export interface ExtractedFees {
  anticipationRate?: string;
  chargebackFee?: string;
}

interface ParsedResult {
  matrix: MDRMatrix;
  fees: ExtractedFees;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore?: number;
  missingData: string[];
  partial?: boolean;
  debug?: {
    logs: string[];
    provider: string;
    quality?: { totalFilled: number; perBrand: Record<string, number> };
    rawFull?: string;
    parsedTable?: Record<string, (number | null)[]>;
  };
}

interface PDFImportModalProps {
  currentMatrix: MDRMatrix;
  onConfirm: (matrix: MDRMatrix, fees: ExtractedFees) => void;
  onClose: () => void;
}

const CONFIDENCE_LABEL = {
  high:   { label: 'Alta confiança',   color: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200' },
  medium: { label: 'Confiança média',  color: 'text-amber-700 bg-amber-50 ring-1 ring-amber-200' },
  low:    { label: 'Baixa confiança',  color: 'text-red-700 bg-red-50 ring-1 ring-red-200' },
};

const MAX_FILE_SIZE_MB = 20;
const ACCEPTED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function PDFImportModal({ currentMatrix, onConfirm, onClose }: PDFImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [editMatrix, setEditMatrix] = useState<MDRMatrix>(createEmptyMatrix());
  const [editFees, setEditFees] = useState<ExtractedFees>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [errorDebug, setErrorDebug] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [overwriteAll, setOverwriteAll] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFileError('');
    if (!ACCEPTED_TYPES.has(f.type)) {
      setFileError(`Tipo não suportado: ${f.type || 'desconhecido'}. Use PDF, PNG, JPG ou WebP.`);
      return;
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`Arquivo muito grande (${(f.size / 1024 / 1024).toFixed(1)} MB). Máximo: ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
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
        setErrorDebug(data.debug?.preview ?? '');
        setStep('error');
        return;
      }
      setErrorDebug('');

      setParsed(data);
      setEditMatrix(data.matrix);
      setEditFees(data.fees ?? {});
      setStep('review');
    } catch {
      setErrorMsg('Falha de conexão ao processar o arquivo. Tente novamente.');
      setStep('error');
    }
  }

  function handleConfirm() {
    if (!parsed) return;
    let finalMatrix: MDRMatrix;

    if (overwriteAll) {
      finalMatrix = editMatrix;
    } else {
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
      finalMatrix = merged;
    }

    onConfirm(finalMatrix, editFees);
  }

  function updateCell(brand: BrandName, inst: number, field: 'mdrBase' | 'anticipationRate', value: string) {
    setEditMatrix(prev => {
      const entry = { ...prev[brand][inst as InstallmentNumber] };
      entry[field] = value;
      const base = parseFloat(entry.mdrBase || '0');
      const ant = parseFloat(entry.anticipationRate || '0');
      entry.finalMdr = (!isNaN(base) ? (base + ant).toFixed(4) : '');
      return { ...prev, [brand]: { ...prev[brand], [inst]: entry } };
    });
  }

  const hasExtractedFees = editFees.anticipationRate || editFees.chargebackFee;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(22,20,25,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Importar Proposta Concorrente</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload de PDF ou imagem → extração por IA → preenchimento automático
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-gray-100 px-6 py-2.5 gap-6">
          {(['upload', 'processing', 'review'] as const).map((s, i) => {
            const steps = ['upload', 'processing', 'review'];
            const currentIdx = steps.indexOf(step === 'error' ? 'processing' : step);
            const isDone = i < currentIdx;
            const isActive = s === step || (step === 'error' && s === 'processing');
            return (
              <div key={s} className={cn('flex items-center gap-1.5 text-xs font-medium', isActive ? 'text-brand' : isDone ? 'text-emerald-600' : 'text-gray-400')}>
                <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', isActive ? 'bg-brand text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400')}>
                  {isDone ? '✓' : i + 1}
                </span>
                {s === 'upload' ? 'Upload' : s === 'processing' ? 'Processando' : 'Revisão'}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* UPLOAD */}
          {step === 'upload' && (
            <div className="flex flex-col gap-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                  dragging
                    ? 'border-brand bg-brand-50'
                    : fileError
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 bg-gray-50 hover:border-brand/50 hover:bg-brand-50/40'
                )}
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border', fileError ? 'bg-red-50 border-red-200' : 'bg-brand-50 border-brand-200')}>
                  <svg className={cn('w-6 h-6', fileError ? 'text-red-500' : 'text-brand')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">
                  {dragging ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
                </p>
                <p className="text-xs text-gray-500">PDF, PNG, JPG ou WebP · máx {MAX_FILE_SIZE_MB} MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {fileError && (
                <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">
                  <span>⚠</span> {fileError}
                </p>
              )}

              {file && !fileError && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-brand" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB · {file.type}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setFileError(''); }}
                    className="text-gray-400 hover:text-gray-700 p-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {preview && (
                <img src={preview} alt="Preview" className="rounded-xl border border-gray-200 max-h-44 object-contain w-full bg-gray-50" />
              )}

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-800 mb-1">Como funciona</p>
                <p className="text-xs text-blue-700">
                  A IA analisa tabelas de MDR, taxas por bandeira, parcelamentos e antecipação.
                  Você revisa e edita todos os valores antes de confirmar.
                </p>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
                <div className="absolute inset-0 rounded-full border-4 border-brand border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900 mb-1">Analisando proposta…</p>
                <p className="text-xs text-gray-500">Extração de MDR, taxas e bandeiras via IA</p>
              </div>
            </div>
          )}

          {/* REVIEW */}
          {step === 'review' && parsed && (
            <div className="flex flex-col gap-5">
              {/* Confidence + missing + debug */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', CONFIDENCE_LABEL[parsed.confidence].color)}>
                  {CONFIDENCE_LABEL[parsed.confidence].label}
                  {parsed.confidenceScore != null && ` (${parsed.confidenceScore}%)`}
                </span>
                {parsed.partial && (
                  <span className="text-xs text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full ring-1 ring-orange-200">
                    ⚠ Extração parcial — revise os valores
                  </span>
                )}
                {parsed.missingData.length > 0 && (
                  <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full ring-1 ring-amber-200">
                    ⚠ Dados não encontrados: {parsed.missingData.slice(0, 3).join(', ')}
                    {parsed.missingData.length > 3 && ` +${parsed.missingData.length - 3}`}
                  </span>
                )}
                {parsed.debug && (
                  <details className="w-full mt-1">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                      Debug — provider: {parsed.debug.provider}
                      {parsed.debug.quality && ` · ${parsed.debug.quality.totalFilled} células preenchidas`}
                    </summary>
                    <div className="mt-2 flex flex-col gap-2">
                      {parsed.debug.quality && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(parsed.debug.quality.perBrand).map(([brand, count]) => (
                            <span key={brand} className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-mono',
                              count >= 12 ? 'bg-emerald-100 text-emerald-700' :
                              count > 0  ? 'bg-amber-100 text-amber-700' :
                                           'bg-red-100 text-red-700'
                            )}>
                              {brand}: {count}/12
                            </span>
                          ))}
                        </div>
                      )}
                      <details>
                        <summary className="text-[10px] text-gray-400 cursor-pointer">Logs do servidor</summary>
                        <pre className="mt-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 max-h-24 overflow-auto font-mono">
                          {parsed.debug.logs.join('\n')}
                        </pre>
                      </details>
                      {parsed.debug.parsedTable && (
                        <details>
                          <summary className="text-[10px] text-gray-400 cursor-pointer">Arrays parseados por bandeira</summary>
                          <pre className="mt-1 text-[10px] text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 max-h-32 overflow-auto font-mono">
                            {Object.entries(parsed.debug.parsedTable).map(([brand, arr]) =>
                              `${brand}: [${arr.map(v => v ?? 'null').join(', ')}]`
                            ).join('\n')}
                          </pre>
                        </details>
                      )}
                      {parsed.debug.rawFull && (
                        <details>
                          <summary className="text-[10px] text-gray-400 cursor-pointer">Resposta bruta completa da IA</summary>
                          <pre className="mt-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 max-h-48 overflow-auto font-mono whitespace-pre-wrap">
                            {parsed.debug.rawFull}
                          </pre>
                        </details>
                      )}
                    </div>
                  </details>
                )}
              </div>

              <p className="text-xs text-gray-500 -mt-2">
                Revise e edite os valores antes de confirmar. Células verdes foram preenchidas pela IA.
              </p>

              {/* Extracted fees — shown only when AI found something */}
              {hasExtractedFees && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold text-emerald-800 mb-3 flex items-center gap-1.5">
                    <span>✦</span> Taxas operacionais extraídas — serão aplicadas ao Passo 3
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {editFees.anticipationRate !== undefined && (
                      <div>
                        <label className="text-xs text-emerald-700 font-medium block mb-1">Taxa de Antecipação (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editFees.anticipationRate}
                          onChange={e => setEditFees(f => ({ ...f, anticipationRate: e.target.value }))}
                          className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-800"
                        />
                      </div>
                    )}
                    {editFees.chargebackFee !== undefined && (
                      <div>
                        <label className="text-xs text-emerald-700 font-medium block mb-1">Taxa de Chargeback (R$)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editFees.chargebackFee}
                          onChange={e => setEditFees(f => ({ ...f, chargebackFee: e.target.value }))}
                          className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-800"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MDR table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Parc.</th>
                      {BRANDS.map(b => (
                        <th key={b} colSpan={2} className="px-2 py-2 text-center font-semibold text-gray-700">
                          {BRAND_LABELS[b]}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400">
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
                      <tr key={inst} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-3 py-1.5 font-semibold text-gray-700">{inst}x</td>
                        {BRANDS.map(b => {
                          const entry = editMatrix[b][inst as InstallmentNumber];
                          const hasValue = !!entry.mdrBase;
                          return (
                            <Fragment key={b}>
                              <td className="px-1 py-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={entry.mdrBase}
                                  onChange={e => updateCell(b, inst, 'mdrBase', e.target.value)}
                                  className={cn(
                                    'w-14 text-center rounded-lg border px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand',
                                    hasValue
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                      : 'border-gray-200 bg-white text-gray-400'
                                  )}
                                  placeholder="—"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={entry.anticipationRate}
                                  onChange={e => updateCell(b, inst, 'anticipationRate', e.target.value)}
                                  className="w-14 text-center rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand text-gray-600"
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

              {/* Merge option */}
              <label className="flex items-start gap-3 cursor-pointer p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={overwriteAll}
                  onChange={e => setOverwriteAll(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Substituir tabela inteira</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Desmarcado (recomendado): preenche apenas células vazias, mantendo o que você já digitou
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-center max-w-lg">
                <p className="text-sm font-semibold text-gray-900 mb-1">Falha na extração</p>
                <p className="text-xs text-gray-500">{errorMsg}</p>
                {errorDebug && (
                  <details className="mt-3 text-left">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Ver resposta da IA (debug)</summary>
                    <pre className="mt-2 text-[10px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-32 overflow-auto font-mono whitespace-pre-wrap">{errorDebug}</pre>
                  </details>
                )}
              </div>
              <button
                onClick={() => { setStep('upload'); setFile(null); setPreview(null); setErrorDebug(''); }}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <div className="flex gap-2">
            {step === 'upload' && (
              <button
                onClick={handleAnalyze}
                disabled={!file || !!fileError}
                className={cn(
                  'px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all',
                  file && !fileError
                    ? 'bg-brand hover:bg-brand-600 shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                Analisar com IA →
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleConfirm}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-600 shadow-sm transition-colors"
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
