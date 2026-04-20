import { z } from 'zod';
import { ContractDataSchema } from './contract';

export const ProposalDataSchema = ContractDataSchema.extend({
  validadeAte: z.string().min(1, 'Validade obrigatória'),
  observacoes: z.string().optional().default(''),
});

export type ProposalData = z.infer<typeof ProposalDataSchema>;

export interface ProposalRecord {
  id: string;
  proposalNumber: string;
  status: 'rascunho' | 'enviada' | 'aprovada' | 'expirada';
  contratanteNome: string;
  contratanteCnpj: string;
  validadeAte: string;
  contractId?: string | null;
  createdAt: string;
  updatedAt: string;
}

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
  dataInicio: new Date().toLocaleDateString('pt-BR'),
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
  taxaPreChargeback: '0.00',
  taxaChargeback: '65.00',
  prazoRecebimento: 'D0',
  valorMinimoMensal: '0.00',
  validadeAte: '',
  observacoes: '',
};
