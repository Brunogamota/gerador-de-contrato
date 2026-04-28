import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface BrasilApiCnpj {
  razao_social?:   string;
  nome_fantasia?:  string;
  logradouro?:     string;
  numero?:         string;
  complemento?:    string;
  bairro?:         string;
  municipio?:      string;
  uf?:             string;
  cep?:            string;
  email?:          string;
  ddd_telefone_1?: string;
  situacao?:       string;
  message?:        string;
}

function formatAddress(d: BrasilApiCnpj): string {
  return [
    d.logradouro,
    d.numero,
    d.complemento,
    d.bairro,
    d.municipio && d.uf ? `${d.municipio}/${d.uf}` : (d.municipio ?? d.uf),
    d.cep ? `CEP ${d.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : '',
  ].filter(Boolean).join(', ');
}

function formatPhone(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  return digits.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { cnpj: string } },
) {
  const digits = params.cnpj.replace(/\D/g, '');
  if (digits.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8_000) },
    );

    const data: BrasilApiCnpj = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.message ?? 'CNPJ não encontrado na Receita Federal' },
        { status: upstream.status },
      );
    }

    return NextResponse.json({
      nome:     data.razao_social  ?? '',
      fantasia: data.nome_fantasia ?? '',
      endereco: formatAddress(data),
      email:    data.email         ?? '',
      telefone: formatPhone(data.ddd_telefone_1),
      situacao: data.situacao      ?? '',
    });
  } catch (err) {
    console.error('[cnpj-lookup] error:', err);
    return NextResponse.json({ error: 'Erro ao consultar a Receita Federal' }, { status: 502 });
  }
}
