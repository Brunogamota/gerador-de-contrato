import { z } from 'zod';
import { MDRMatrix } from './pricing';

export const ContractDataSchema = z.object({
  contratanteNome: z.string().default(''),
  contratanteCnpj: z.string().default(''),
  contratanteEndereco: z.string().default(''),
  contratanteEmail: z.string().default(''),
  contratanteTelefone: z.string().default(''),

  // Representante legal (opcional)
  repLegalNome:     z.string().default(''),
  repLegalCpf:      z.string().default(''),
  repLegalRg:       z.string().default(''),
  repLegalEmail:    z.string().default(''),
  repLegalTelefone: z.string().default(''),
  repLegalCargo:    z.string().default(''),

  dataInicio: z.string().default(''),
  vigenciaMeses: z.number().int().min(1).max(60).default(12),
  foro: z.string().default('São Paulo/SP'),

  setup: z.string().default('0.00'),
  feeTransacao: z.string().default('0.15'),
  taxaAntifraude: z.string().default('1.00'),
  taxaPix: z.string().default('0.45'),
  taxaPixOut: z.string().default('0.45'),
  taxaSplit: z.string().default('0.00'),
  taxaEstorno: z.string().default('2.50'),
  taxaAntecipacao: z.string().default('1.45'),
  limiteAntecipacao: z.string().default('100'),
  taxa3ds: z.string().default('0.00'),
  taxaPreChargeback: z.string().default('0.00'),
  taxaChargeback: z.string().default('65.00'),
  prazoRecebimento: z.string().default('D0'),
  valorMinimoMensal: z.string().default('0.00'),
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
};
