import { ProposalData } from '@/types/proposal';

interface Props {
  d: ProposalData;
}

const ROW_LABEL = 'px-3 py-2 text-xs font-semibold w-44 align-top';
const ROW_VALUE = 'px-3 py-2 text-xs';

export function ProposalClientSummary({ d }: Props) {
  const rows: [string, string][] = [
    ['Cliente',              d.contratanteNome],
    ['CNPJ / CPF',          d.contratanteCnpj],
    ['Endereço',             d.contratanteEndereco],
    ['E-mail',               d.contratanteEmail],
    ['Telefone',             d.contratanteTelefone],
  ];

  if (d.repLegalNome) {
    rows.push(['Representante Legal', d.repLegalNome + (d.repLegalCargo ? ` — ${d.repLegalCargo}` : '')]);
  }

  rows.push(['Prazo de Recebimento', d.prazoRecebimento]);
  rows.push(['Válida até',           d.validadeAte]);

  return (
    <div className="mb-8">
      <p
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: '#f72662', letterSpacing: '0.1em' }}
      >
        Dados do Cliente
      </p>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr
              key={label}
              style={{ background: i % 2 === 0 ? '#f9fafb' : '#ffffff' }}
            >
              <td className={ROW_LABEL} style={{ color: '#374151' }}>{label}</td>
              <td className={ROW_VALUE} style={{ color: '#111827' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
