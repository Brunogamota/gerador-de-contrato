'use client';

import { useRef, useState } from 'react';
import { parseForecastFile } from '@/lib/pricing/forecastParser';
import { calculatePricingStrategyScore, OperationData, StrategyKey } from '@/lib/pricing/operationalScore';
import { cn } from '@/lib/utils';

interface Recommendation {
  strategy: StrategyKey;
  label: string;
  rationale: string;
  confidence: number;
  suggestions: string[];
  scores: {
    risk:            { label: string; score: number };
    marginPotential: { label: string; score: number };
    competitiveness: { label: string; score: number };
  };
  extracted: string[];
  missing: string[];
}

interface ForecastUploadProps {
  onRecommendation: (strategy: StrategyKey) => void;
  disabled?: boolean;
}

const STRATEGY_COLORS: Record<StrategyKey, { bg: string; badge: string; text: string }> = {
  low:    { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-800' },
  medium: { bg: 'bg-blue-50 border-blue-200',       badge: 'bg-blue-100 text-blue-700',       text: 'text-blue-800'    },
  high:   { bg: 'bg-amber-50 border-amber-200',     badge: 'bg-amber-100 text-amber-700',     text: 'text-amber-800'   },
  max:    { bg: 'bg-rose-50 border-rose-200',       badge: 'bg-rose-100 text-rose-700',       text: 'text-rose-800'    },
};

const SCORE_COLORS = ['text-emerald-600', 'text-amber-600', 'text-red-600'];

function scoreColor(label: string) {
  if (label === 'Baixo') return SCORE_COLORS[0];
  if (label === 'Médio') return SCORE_COLORS[1];
  return SCORE_COLORS[2];
}

function ScoreChip({ label, value, dim }: { label: string; value: number; dim: string }) {
  return (
    <div className="flex flex-col gap-0.5 items-center px-3 py-2 rounded-xl bg-ink-50 border border-ink-200 min-w-[80px]">
      <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wide">{dim}</span>
      <span className={cn('text-sm font-bold', scoreColor(label))}>{label}</span>
      <span className="text-[11px] font-mono text-ink-400">{value}</span>
    </div>
  );
}

export function ForecastUpload({ onRecommendation, disabled }: ForecastUploadProps) {
  const inputRef                              = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]               = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [rec, setRec]                         = useState<Recommendation | null>(null);
  const [fileName, setFileName]               = useState<string | null>(null);
  const [showDetails, setShowDetails]         = useState(false);

  async function processFile(file: File) {
    setLoading(true); setError(null); setRec(null); setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const { data, extracted, missing } = parseForecastFile(buffer);

      // Build full OperationData with safe defaults for missing fields
      const op: OperationData = {
        company: data.company ?? { legalName: '', tradeName: '', cnpj: '', businessModel: '', website: '' },
        volume: data.volume ?? { monthlyTpv: 0, projectedTpv12m: 0, monthlyTransactions: 0, averageTicket: 0 },
        mccMix: data.mccMix ?? [{ mcc: '5999', share: 100 }],
        transactionMix: data.transactionMix ?? { pix: 0, debit: 0, prepaid: 0, credit1x: 0, credit2to6: 0, credit7to12: 0 },
        brandMix: data.brandMix ?? { visa: 50, mastercard: 35, elo: 10, hiper: 3, amex: 2 },
        capture: data.capture ?? { cardPresent: false, cardNotPresent: false, tef: false, tapOnPhone: false, threeDs: false, sdkIntegration: false, whiteLabel: false, customAntifraud: false },
        anticipation: data.anticipation ?? { receivablesAnticipationNeed: 0, estimatedMonthlyAnticipation: 0, averageAnticipationDays: 30, ownFunding: false, rebornSettlement: false },
        ...(data.currentRate !== undefined ? { currentRate: data.currentRate } : {}),
        ...(data.observations ? { observations: data.observations } : {}),
      };

      const result = calculatePricingStrategyScore(op);
      setRec({ ...result, extracted, missing });
    } catch (e) {
      console.error('[ForecastUpload] parse error:', e);
      setError('Não foi possível ler o arquivo. Verifique se é um .xlsx ou .csv válido.');
    } finally {
      setLoading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setError('Formato não suportado. Use .xlsx, .xls ou .csv.');
      return;
    }
    processFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  const c = rec ? STRATEGY_COLORS[rec.strategy] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !loading && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 transition-all cursor-pointer select-none',
          disabled ? 'opacity-40 cursor-not-allowed' :
          dragging  ? 'border-brand bg-brand/5 scale-[1.01]' :
          loading   ? 'border-ink-300 bg-ink-50 cursor-wait' :
          'border-ink-200 bg-ink-50 hover:border-brand/50 hover:bg-brand/3',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled={disabled || loading}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {loading ? (
          <>
            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-ink-600">Analisando planilha…</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-800">
                {fileName ? `Substituir: ${fileName}` : 'Arraste o Forecast Acquirer aqui'}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">ou clique para selecionar · .xlsx / .xls / .csv</p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Recommendation card */}
      {rec && c && (
        <div className={cn('rounded-2xl border-2 p-5 flex flex-col gap-4', c.bg)}>
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Estratégia recomendada</span>
                <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold', c.badge)}>{rec.label}</span>
                <span className="text-xs text-ink-400 font-mono">Confiança: {rec.confidence}%</span>
              </div>
              <p className={cn('text-sm leading-relaxed mt-1', c.text)}>{rec.rationale}</p>
            </div>
          </div>

          {/* Score chips */}
          <div className="flex gap-2 flex-wrap">
            <ScoreChip dim="Risco"       label={rec.scores.risk.label}            value={rec.scores.risk.score}            />
            <ScoreChip dim="Margem"      label={rec.scores.marginPotential.label} value={rec.scores.marginPotential.score} />
            <ScoreChip dim="Competit."   label={rec.scores.competitiveness.label} value={rec.scores.competitiveness.score} />
          </div>

          {/* Suggestions */}
          {rec.suggestions.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {rec.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-ink-700">
                  <span className="mt-0.5 text-brand flex-shrink-0">›</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Extraction details toggle */}
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="self-start text-xs text-ink-400 hover:text-ink-600 underline-offset-2 hover:underline transition-colors"
          >
            {showDetails ? 'Ocultar detalhes' : `Ver campos extraídos (${rec.extracted.length}/${rec.extracted.length + rec.missing.length})`}
          </button>

          {showDetails && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-emerald-700 uppercase tracking-wide">Extraídos</span>
                {rec.extracted.length
                  ? rec.extracted.map((f) => <span key={f} className="font-mono text-emerald-700">✓ {f}</span>)
                  : <span className="text-ink-400 italic">nenhum</span>}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-amber-700 uppercase tracking-wide">Padrão</span>
                {rec.missing.length
                  ? rec.missing.map((f) => <span key={f} className="font-mono text-ink-400">— {f}</span>)
                  : <span className="text-emerald-600 italic">todos extraídos</span>}
              </div>
            </div>
          )}

          {/* Apply button */}
          <button
            type="button"
            onClick={() => onRecommendation(rec.strategy)}
            className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand/90 shadow-sm transition-all"
          >
            Aplicar estratégia {rec.label}
          </button>
        </div>
      )}
    </div>
  );
}
