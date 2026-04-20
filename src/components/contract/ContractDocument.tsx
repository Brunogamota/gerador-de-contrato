'use client';

import { ContractData } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';
import { ContractLetterhead } from './ContractLetterhead';
import { ContractSummaryTable } from './document/ContractSummaryTable';
import { ContractBody } from './document/ContractBody';
import { ContractAnnexI } from './document/ContractAnnexI';
import { ContractAnnexII } from './document/ContractAnnexII';
import { ContractSignatures } from './document/ContractSignatures';

interface ContractDocumentProps {
  contractData: ContractData;
  mdrMatrix: MDRMatrix;
  contractNumber: string;
}

export function ContractDocument({ contractData: d, mdrMatrix, contractNumber }: ContractDocumentProps) {
  return (
    <div
      id="contract-document"
      className="bg-white font-serif text-xs text-gray-900 leading-relaxed p-10 max-w-4xl mx-auto"
      style={{ fontFamily: 'Times New Roman, serif', fontSize: '10pt', lineHeight: '1.6' }}
    >
      <ContractLetterhead forPrint />

      <p className="text-center font-bold text-sm uppercase tracking-wide mb-6">
        CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GATEWAY E ORQUESTRADOR DE PAGAMENTO COM SOLUÇÃO ANTIFRAUDE
      </p>

      <ContractSummaryTable d={d} contractNumber={contractNumber} />
      <ContractBody d={d} />
      <ContractAnnexI />
      <ContractAnnexII d={d} mdrMatrix={mdrMatrix} />
      <ContractSignatures d={d} />
    </div>
  );
}
