import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { ContractDataSchema } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';
import { generateContractNumber } from '@/lib/utils';
import { isMdrMatrix } from '@/lib/guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const contracts = await prisma.contract.findMany({ orderBy: { createdAt: 'desc' } });
    console.log(`[contracts] GET found=${contracts.length}`);
    return NextResponse.json(contracts);
  } catch (err) {
    console.error('[contracts] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const body = await req.json();
    const { data, mdrMatrix, contractNumber } = body as {
      data: unknown;
      mdrMatrix: unknown;
      contractNumber?: string;
    };

    const parsed = ContractDataSchema.safeParse(data);
    if (!parsed.success) {
      console.warn('[contracts] POST invalid data:', parsed.error.flatten());
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    if (!isMdrMatrix(mdrMatrix)) {
      console.warn('[contracts] POST invalid mdrMatrix shape');
      return NextResponse.json({ error: 'Invalid mdrMatrix: expected object with all brand keys' }, { status: 400 });
    }

    const d = parsed.data;
    console.log(`[contracts] POST contratante="${d.contratanteNome}" cnpj=${d.contratanteCnpj}`);

    const contract = await prisma.contract.create({
      data: {
        contractNumber:      contractNumber ?? generateContractNumber(),
        contratanteNome:     d.contratanteNome,
        contratanteCnpj:     d.contratanteCnpj,
        contratanteEndereco: d.contratanteEndereco,
        contratanteEmail:    d.contratanteEmail,
        contratanteTelefone: d.contratanteTelefone,
        repLegalNome:        d.repLegalNome     || null,
        repLegalCpf:         d.repLegalCpf      || null,
        repLegalRg:          d.repLegalRg       || null,
        repLegalEmail:       d.repLegalEmail    || null,
        repLegalTelefone:    d.repLegalTelefone || null,
        repLegalCargo:       d.repLegalCargo    || null,
        dataInicio:          d.dataInicio,
        vigenciaMeses:       d.vigenciaMeses,
        foro:                d.foro,
        setup:               d.setup,
        feeTransacao:        d.feeTransacao,
        taxaAntifraude:      d.taxaAntifraude,
        taxaPix:             d.taxaPix,
        taxaPixOut:          d.taxaPixOut,
        taxaSplit:           d.taxaSplit,
        taxaEstorno:         d.taxaEstorno,
        taxaAntecipacao:     d.taxaAntecipacao,
        taxaPreChargeback:   d.taxaPreChargeback,
        taxaChargeback:      d.taxaChargeback,
        prazoRecebimento:    d.prazoRecebimento,
        valorMinimoMensal:   d.valorMinimoMensal,
        mdrMatrix:           JSON.stringify(mdrMatrix as MDRMatrix),
        status:              'draft',
      },
    });

    console.log(`[contracts] POST ok → id=${contract.id} num=${contract.contractNumber}`);
    return NextResponse.json(contract, { status: 201 });
  } catch (err) {
    console.error('[contracts] POST error:', err);
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }
}
