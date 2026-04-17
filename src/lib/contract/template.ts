import { ContractData } from '@/types/contract';
import { MDRMatrix, BRANDS, INSTALLMENTS, BRAND_LABELS, BrandName, InstallmentNumber } from '@/types/pricing';
import { formatCurrency, formatPercent } from '@/lib/utils';

export interface ContractVariables extends Record<string, string> {
  contratante_nome: string;
  contratante_cnpj: string;
  contratante_endereco: string;
  contratante_email: string;
  contratante_telefone: string;
  data_inicio: string;
  vigencia: string;
  foro: string;
  setup: string;
  fee_transacao: string;
  taxa_antifraude: string;
  taxa_pix: string;
  taxa_pix_out: string;
  taxa_split: string;
  taxa_estorno: string;
  taxa_antecipacao: string;
  taxa_pre_chargeback: string;
  taxa_chargeback: string;
  prazo_recebimento: string;
  valor_minimo_mensal: string;
  data_assinatura: string;
}

export function buildVariables(data: ContractData, matrix: MDRMatrix): ContractVariables {
  const vars: Record<string, string> = {
    contratante_nome: data.contratanteNome,
    contratante_cnpj: data.contratanteCnpj,
    contratante_endereco: data.contratanteEndereco,
    contratante_email: data.contratanteEmail,
    contratante_telefone: data.contratanteTelefone,
    data_inicio: data.dataInicio,
    vigencia: String(data.vigenciaMeses),
    foro: data.foro,
    setup: formatCurrency(data.setup),
    fee_transacao: formatCurrency(data.feeTransacao),
    taxa_antifraude: formatCurrency(data.taxaAntifraude),
    taxa_pix: formatCurrency(data.taxaPix),
    taxa_pix_out: formatCurrency(data.taxaPixOut),
    taxa_split: formatCurrency(data.taxaSplit),
    taxa_estorno: formatCurrency(data.taxaEstorno),
    taxa_antecipacao: `${parseFloat(data.taxaAntecipacao).toFixed(2).replace('.', ',')}%`,
    taxa_pre_chargeback: formatCurrency(data.taxaPreChargeback),
    taxa_chargeback: formatCurrency(data.taxaChargeback),
    prazo_recebimento: data.prazoRecebimento,
    valor_minimo_mensal: formatCurrency(data.valorMinimoMensal),
    data_assinatura: `São Paulo/SP, ${data.dataInicio}`,
  };

  // Inject MDR variables for every brand×installment
  for (const brand of BRANDS) {
    for (const inst of INSTALLMENTS) {
      const entry = matrix[brand][inst as InstallmentNumber];
      const key = `mdr_${brand}_${inst}x`;
      const value = entry.finalMdr
        ? `${parseFloat(entry.finalMdr).toFixed(2).replace('.', ',')}%`
        : '-';
      vars[key] = value;
    }
  }

  return vars as ContractVariables;
}

export function injectVariables(template: string, vars: ContractVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

export function buildMdrTableHtml(matrix: MDRMatrix): string {
  const headers = ['Parcelas', ...BRANDS.map((b) => BRAND_LABELS[b])];

  let html = `<table class="mdr-table" style="width:100%;border-collapse:collapse;font-size:9pt;margin:8px 0">`;
  html += `<thead><tr>`;
  for (const h of headers) {
    html += `<th style="border:1px solid #d1d5db;padding:4px 8px;background:#f9fafb;font-weight:600;text-align:center">${h}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (const inst of INSTALLMENTS) {
    html += `<tr>`;
    html += `<td style="border:1px solid #d1d5db;padding:4px 8px;text-align:center;font-weight:500">${inst}x</td>`;
    for (const brand of BRANDS) {
      const entry = matrix[brand][inst as InstallmentNumber];
      const display = entry.finalMdr
        ? `${parseFloat(entry.finalMdr).toFixed(2).replace('.', ',')}%`
        : '-';
      html += `<td style="border:1px solid #d1d5db;padding:4px 8px;text-align:center">${display}</td>`;
    }
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  return html;
}
