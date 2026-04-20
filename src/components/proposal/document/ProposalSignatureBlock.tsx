import { ProposalData } from '@/types/proposal';

interface Props {
  d: ProposalData;
}

export function ProposalSignatureBlock({ d }: Props) {
  return (
    <div className="mt-8 pt-6 border-t border-gray-300 break-before-page">
      <p className="font-semibold text-xs mb-6 uppercase tracking-wide text-center">Aceite da Proposta</p>

      <div className="grid grid-cols-2 gap-16 mt-8">
        {/* REBORN */}
        <div className="text-xs">
          <div className="border-t border-gray-400 pt-2 mt-12">
            <p className="font-semibold">REBORN TECNOLOGIA E SERVIÇOS LTDA</p>
            <p className="text-gray-600">CNPJ 59.627.567/0001-35</p>
            <p className="text-gray-600 mt-1">Nome: ___________________________</p>
            <p className="text-gray-600">Cargo: ___________________________</p>
            <p className="text-gray-600 mt-1">Data: ___/___/_______</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="text-xs">
          <div className="border-t border-gray-400 pt-2 mt-12">
            <p className="font-semibold">{d.contratanteNome}</p>
            <p className="text-gray-600">{d.contratanteCnpj}</p>
            {d.repLegalNome ? (
              <>
                <p className="text-gray-600 mt-1">Nome: {d.repLegalNome}</p>
                {d.repLegalCargo && <p className="text-gray-600">Cargo: {d.repLegalCargo}</p>}
              </>
            ) : (
              <>
                <p className="text-gray-600 mt-1">Nome: ___________________________</p>
                <p className="text-gray-600">Cargo: ___________________________</p>
              </>
            )}
            <p className="text-gray-600 mt-1">Data: ___/___/_______</p>
          </div>
        </div>
      </div>
    </div>
  );
}
