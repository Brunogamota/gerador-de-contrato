'use client';

import { useState } from 'react';
import { getContractPdfBase64 } from '@/lib/contract/generator';
import { cn } from '@/lib/utils';

interface Signer {
  name: string;
  email: string;
  role: string;
}

interface SignerLink {
  name: string;
  email: string;
  link: string;
  status: string;
}

interface Props {
  contractId: string;
  contractNumber: string;
  contractElementId?: string;
  // Pre-filled signer data from contract
  clientName: string;
  clientEmail: string;
  repName?: string;
  repEmail?: string;
  // Current ZapSign state from DB
  zapSignStatus?: string | null;
  zapSignSigners?: string | null;
  sentForSignatureAt?: Date | null;
  signedAt?: Date | null;
}

const STATUS_UI = {
  pending: { label: 'Aguardando Assinatura', color: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-400' },
  signed:  { label: 'Assinado',              color: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  refused: { label: 'Recusado',              color: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500' },
};

export function SignaturePanel({
  contractId, contractNumber, contractElementId = 'contract-document',
  clientName, clientEmail, repName, repEmail,
  zapSignStatus, zapSignSigners, sentForSignatureAt, signedAt,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [signers, setSigners] = useState<Signer[]>(() => {
    const list: Signer[] = [
      { name: clientName, email: clientEmail, role: 'Contratante' },
    ];
    if (repName && repEmail) list.push({ name: repName, email: repEmail, role: 'Representante Legal' });
    list.push({ name: 'Bruno Gamota', email: 'bruno@rebornpay.io', role: 'REBORN (Contratada)' });
    return list;
  });

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentLinks, setSentLinks] = useState<SignerLink[] | null>(null);

  // Parse stored signer links from DB
  const storedLinks: SignerLink[] = (() => {
    if (!zapSignSigners) return [];
    try { return JSON.parse(zapSignSigners) as SignerLink[]; } catch { return []; }
  })();

  const statusUi = zapSignStatus ? STATUS_UI[zapSignStatus as keyof typeof STATUS_UI] : null;

  function updateSigner(idx: number, field: keyof Signer, value: string) {
    setSigners((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function removeSigner(idx: number) {
    setSigners((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSigner() {
    setSigners((prev) => [...prev, { name: '', email: '', role: '' }]);
  }

  async function handleSend() {
    const invalid = signers.find((s) => !s.name.trim() || !s.email.trim());
    if (invalid) { setSendError('Preencha nome e e-mail de todos os signatários.'); return; }

    setSending(true);
    setSendError('');
    try {
      // Generate PDF from DOM
      const pdfBase64 = await getContractPdfBase64(contractElementId);

      const res = await fetch(`/api/contracts/${contractId}/send-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          signers: signers.map((s) => ({ name: s.name, email: s.email })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar');

      setSentLinks(data.signers as SignerLink[]);
      setShowModal(false);
      // Reload to update status from DB
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  }

  // contractNumber is used in the modal title
  void contractNumber;

  return (
    <>
      {/* Status bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {statusUi ? (
            <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border', statusUi.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', statusUi.dot)} />
              {statusUi.label}
              {signedAt && <span className="opacity-70">· {new Date(signedAt).toLocaleDateString('pt-BR')}</span>}
            </div>
          ) : (
            <span className="text-xs text-gray-400 font-medium">Não enviado para assinatura</span>
          )}

          {sentForSignatureAt && !signedAt && (
            <span className="text-xs text-gray-400">
              Enviado {new Date(sentForSignatureAt).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Show signer links if already sent */}
          {storedLinks.length > 0 && (
            <div className="flex gap-2">
              {storedLinks.map((s, i) => (
                <a key={i} href={s.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-ink-200 bg-white text-ink-700 hover:bg-ink-50 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  {s.name.split(' ')[0]}
                </a>
              ))}
            </div>
          )}

          {zapSignStatus !== 'signed' && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand/90 shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {zapSignStatus === 'pending' ? 'Reenviar para Assinatura' : 'Enviar para Assinatura'}
            </button>
          )}
        </div>
      </div>

      {/* Success toast */}
      {sentLinks && (
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-semibold text-emerald-800">✓ Enviado para assinatura via ZapSign</p>
          <div className="flex flex-wrap gap-2">
            {sentLinks.map((s, i) => (
              <a key={i} href={s.link} target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium text-emerald-700 underline"
              >
                Link {s.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-950">Enviar para Assinatura</h2>
                <p className="text-xs text-ink-400 mt-0.5">
                  O PDF será gerado e enviado à ZapSign. Cada signatário recebe um e-mail com o link de assinatura.
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-ink-400 hover:text-ink-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Signers list */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Signatários</p>
                <button onClick={addSigner}
                  className="text-xs font-semibold text-brand hover:text-brand/80 transition-colors"
                >
                  + Adicionar signatário
                </button>
              </div>

              {signers.map((s, i) => (
                <div key={i} className="flex gap-2 items-start p-3 rounded-xl border border-ink-200 bg-ink-50">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink-500">{s.role || `Signatário ${i + 1}`}</p>
                    <div className="flex gap-2">
                      <input
                        value={s.name}
                        onChange={(e) => updateSigner(i, 'name', e.target.value)}
                        placeholder="Nome completo"
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-ink-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                      <input
                        value={s.email}
                        onChange={(e) => updateSigner(i, 'email', e.target.value)}
                        placeholder="e-mail"
                        type="email"
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-ink-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                  {i > 0 && (
                    <button onClick={() => removeSigner(i)} className="mt-6 text-ink-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {sendError && (
              <p className="text-sm text-red-600 font-medium">{sendError}</p>
            )}

            <div className="flex gap-3 pt-2 border-t border-ink-100">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-600 hover:bg-ink-50 transition-colors"
              >
                Cancelar
              </button>
              <button onClick={handleSend} disabled={sending}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                  sending ? 'bg-ink-400 cursor-not-allowed' : 'bg-brand hover:bg-brand/90 shadow-sm',
                )}
              >
                {sending ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Gerando PDF…</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Enviar para Assinatura
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
