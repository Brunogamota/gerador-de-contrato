import { z } from 'zod';
import { ContractDataSchema } from './contract';
import { MarginConfig, DEFAULT_MARGIN_CONFIG } from '@/lib/pricing/margin';

export type { MarginConfig };
export { DEFAULT_MARGIN_CONFIG };

export const ProposalDataSchema = ContractDataSchema.extend({
  mcc:         z.string().default(''),
  tipoMercado: z.enum(['brasil', 'intl', 'both']).default('brasil'),
  validadeAte: z.string().min(1, 'Validade obrigatória'),
  observacoes: z.string().optional().default(''),
});

export type ProposalData = z.infer<typeof ProposalDataSchema>;

export type ProposalStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted_to_contract';

export interface ProposalRecord {
  id: string;
  proposalNumber: string;
  status: ProposalStatus;
  contratanteNome: string;
  contratanteCnpj: string;
  mcc?: string | null;
  tipoMercado?: string | null;
  validadeAte: string;
  contractId?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  acceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, { label: string; color: string }> = {
  draft:                { label: 'Rascunho',    color: 'bg-ink-800/50 text-ink-300' },
  generated:            { label: 'Gerada',      color: 'bg-violet-950/50 text-violet-300' },
  sent:                 { label: 'Enviada',     color: 'bg-blue-950/50 text-blue-300' },
  viewed:               { label: 'Visualizada', color: 'bg-cyan-950/50 text-cyan-300' },
  accepted:             { label: 'Aceita',      color: 'bg-emerald-950/50 text-emerald-300' },
  rejected:             { label: 'Recusada',    color: 'bg-red-950/50 text-red-300' },
  expired:              { label: 'Expirada',    color: 'bg-amber-950/50 text-amber-300' },
  converted_to_contract:{ label: 'Convertida',  color: 'bg-emerald-900/60 text-emerald-200' },
};

export const DEFAULT_PROPOSAL_DATA: ProposalData = {
  contratanteNome: '',
  contratanteCnpj: '',
  contratanteEndereco: '',
  contratanteEmail: '',
  contratanteTelefone: '',
  repLegalNome: '',
  repLegalCpf: '',
  repLegalRg: '',
  repLegalEmail: '',
  repLegalTelefone: '',
  repLegalCargo: '',
  dataInicio: '',
  vigenciaMeses: 12,
  foro: 'São Paulo/SP',
  setup: '0.00',
  feeTransacao: '0.15',
  taxaAntifraude: '1.00',
  taxaPix: '0.45',
  taxaPixOut: '0.45',
  taxaSplit: '0.00',
  taxaEstorno: '2.50',
  taxaAntecipacao: '1.45',
  limiteAntecipacao: '100',
  taxa3ds: '0.00',
  taxaPreChargeback: '0.00',
  taxaChargeback: '65.00',
  prazoRecebimento: 'D0',
  valorMinimoMensal: '0.00',
  mcc: '',
  tipoMercado: 'brasil' as const,
  validadeAte: '',
  observacoes: '',
};
