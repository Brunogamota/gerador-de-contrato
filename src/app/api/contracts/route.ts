import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { ContractDataSchema } from '@/types/contract';
import { MDRMatrix } from '@/types/pricing';
import { generateContractNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const contracts = await prisma.contract.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contracts);
  } catch (err) {
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
      mdrMatrix: MDRMatrix;
      contractNumber?: string;
    };

    const parsed = ContractDataSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const contract = await prisma.contract.create({
      data: {
        contractNumber: contractNumber ?? generateContractNumber(),
        contratanteNome:     d.contratanteNome,
        contratanteCnpj:     d.contratanteCnpj,
        contratanteEndereco: d.contratanteEndereco,
        contratanteEmail:    d.contratanteEmail,
        contratanteTelefone: d.contratanteTelefone,
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
        mdrMatrix:           JSON.stringify(mdrMatrix ?? {}),
        status:              'draft',
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }
}
