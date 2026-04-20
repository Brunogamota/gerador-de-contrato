import { ProposalData } from '@/types/proposal';
import { TD, TH } from '@/components/contract/document/formatters';

interface Props {
  d: ProposalData;
}

export function ProposalClientSummary({ d }: Props) {
  const rows: [string, string][] = [
    ['Cliente',              d.contratanteNome],
    ['CNPJ / CPF',          d.contratanteCnpj],
    ['Endereço',             d.contratanteEndereco],
    ['E-mail',               d.contratanteEmail],
    ['Telefone',             d.contratanteTelefone],
    ['Prazo de Recebimento', d.prazoRecebimento],
    ['Válida até',           d.validadeAte],
  ];

  if (d.repLegalNome) {
    rows.splice(5, 0, ['Representante Legal', d.repLegalNome + (d.repLegalCargo ? ` — ${d.repLegalCargo}` : '')]);
  }

  return (
    <div className="mb-6">
      <p className="font-semibold text-xs mb-2 uppercase tracking-wide">Dados do Cliente</p>
      <table className="w-full border-collapse text-xs">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className={`${TH} w-40`}>{label}</td>
              <td className={TD}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
