import { z } from 'zod';
import { MDRMatrix } from './pricing';

export const ContractDataSchema = z.object({
  contratanteNome: z.string().min(2, 'Nome obrigatório'),
  contratanteCnpj: z.string().min(14, 'CNPJ inválido'),
  contratanteEndereco: z.string().min(5, 'Endereço obrigatório'),
  contratanteEmail: z.string().email('E-mail inválido'),
  contratanteTelefone: z.string().min(8, 'Telefone obrigatório'),

  dataInicio: z.string().min(1, 'Data de início obrigatória'),
  vigenciaMeses: z.number().int().min(1).max(60).default(12),
  foro: z.string().default('São Paulo/SP'),

  setup: z.string().default('0.00'),
  setupParcelas: z.number().int().min(1).max(24).default(1),
  feeTransacao: z.string().default('0.15'),
  taxaAntifraude: z.string().default('1.00'),
  taxaPix: z.string().default('0.45'),
  taxaPixOut: z.string().default('0.45'),
  taxaSplit: z.string().default('0.00'),
  taxaEstorno: z.string().default('2.50'),
  taxaAntecipacao: z.string().default('1.45'),
  taxaPreChargeback: z.string().default('0.00'),
  taxaChargeback: z.string().default('65.00'),
  prazoRecebimento: z.string().default('D0'),
  valorMinimoMensal: z.string().default('0.00'),
  isencaoFeeAteMeses: z.number().int().min(0).max(36).default(0),
});

export type ContractData = z.infer<typeof ContractDataSchema>;

export interface FullContractPayload {
  data: ContractData;
  mdrMatrix: MDRMatrix;
}

export interface ContractRecord {
  id: string;
  contractNumber: string;
  status: 'draft' | 'active' | 'signed';
  contratanteNome: string;
  contratanteCnpj: string;
  dataInicio: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CONTRACT_DATA: ContractData = {
  contratanteNome: '',
  contratanteCnpj: '',
  contratanteEndereco: '',
  contratanteEmail: '',
  contratanteTelefone: '',
  dataInicio: new Date().toLocaleDateString('pt-BR'),
  vigenciaMeses: 12,
  foro: 'São Paulo/SP',
  setup: '0.00',
  setupParcelas: 1,
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
  isencaoFeeAteMeses: 0,
};
