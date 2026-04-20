import { ContractData } from '@/types/contract';
import { TD, TH } from './formatters';

interface Props {
  d: ContractData;
  contractNumber: string;
}

export function ContractSummaryTable({ d, contractNumber }: Props) {
  return (
    <>
      <p className="font-bold text-xs uppercase mb-2">QUADRO-RESUMO</p>
      <table className="w-full border-collapse mb-6 text-xs">
        <tbody>
          <tr><td className={TH} style={{ width: '30%' }}>Nº do Contrato</td><td className={TD}>{contractNumber}</td></tr>
          <tr><td className={TH}>CONTRATANTE</td><td className={TD}>{d.contratanteNome}</td></tr>
          <tr><td className={TH}>CNPJ/CPF</td><td className={TD}>{d.contratanteCnpj}</td></tr>
          <tr><td className={TH}>Endereço</td><td className={TD}>{d.contratanteEndereco}</td></tr>
          <tr><td className={TH}>E-mail</td><td className={TD}>{d.contratanteEmail}</td></tr>
          <tr><td className={TH}>Telefone</td><td className={TD}>{d.contratanteTelefone}</td></tr>
          <tr><td className={TH}>CONTRATADA</td><td className={TD}>REBORN TECNOLOGIA E SERVIÇOS LTDA</td></tr>
          <tr><td className={TH}>CNPJ</td><td className={TD}>59.627.567/0001-35</td></tr>
          <tr><td className={TH}>Endereço</td><td className={TD}>Avenida Brg. Faria Lima, 1572, Sala 1022 - Edifício Barão de Rothschild - Jardim Paulistano, São Paulo/SP, CEP 01451-917</td></tr>
          <tr><td className={TH}>E-mail</td><td className={TD}>juridico@rebornpay.io</td></tr>
          <tr><td className={TH}>Telefone</td><td className={TD}>011 97420-5761</td></tr>
          <tr><td className={TH}>Serviços Contratados</td><td className={TD}>Infraestrutura de Pagamento e Solução Antifraude</td></tr>
          <tr><td className={TH}>Data de Início</td><td className={TD}>{d.dataInicio}</td></tr>
          <tr><td className={TH}>Vigência</td><td className={TD}>{d.vigenciaMeses} meses, renovação automática</td></tr>
          <tr><td className={TH}>Foro</td><td className={TD}>Comarca de {d.foro}</td></tr>
          {d.repLegalNome && (
            <tr>
              <td className={TH}>Representante Legal</td>
              <td className={TD}>
                {d.repLegalNome}
                {d.repLegalCargo ? ` — ${d.repLegalCargo}` : ''}
                {d.repLegalCpf ? ` | CPF: ${d.repLegalCpf}` : ''}
                {d.repLegalRg ? ` | RG: ${d.repLegalRg}` : ''}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
