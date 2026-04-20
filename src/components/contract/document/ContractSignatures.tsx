import { ContractData } from '@/types/contract';

interface Props {
  d: ContractData;
}

export function ContractSignatures({ d }: Props) {
  return (
    <div className="mt-10 pt-6 border-t-2 border-gray-400 break-before-page">
      <p className="text-xs mb-6">E, por estarem assim justas e contratadas, as PARTES assinam o presente Contrato em 2 (duas) vias de igual teor e forma.</p>
      <p className="text-xs mb-8">São Paulo/SP, {d.dataInicio}</p>

      <div className="grid grid-cols-2 gap-12">
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2 mt-12">
            <p className="text-xs font-bold">REBORN TECNOLOGIA E SERVIÇOS LTDA</p>
            <p className="text-xs text-gray-600">CNPJ: 59.627.567/0001-35</p>
            <p className="text-xs mt-1">Bruno Mota</p>
            <p className="text-xs text-gray-600">Representante Legal</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2 mt-12">
            <p className="text-xs font-bold">{d.contratanteNome}</p>
            <p className="text-xs text-gray-600">CNPJ: {d.contratanteCnpj}</p>
            {d.repLegalNome ? (
              <>
                <p className="text-xs mt-1">{d.repLegalNome}</p>
                <p className="text-xs text-gray-600">{d.repLegalCargo || 'Representante Legal'}</p>
                {d.repLegalCpf && <p className="text-xs text-gray-600">CPF: {d.repLegalCpf}</p>}
              </>
            ) : (
              <>
                <p className="text-xs mt-1">&nbsp;</p>
                <p className="text-xs text-gray-600">Representante Legal</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
