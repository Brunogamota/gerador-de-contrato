import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { ProposalDataSchema } from '@/types/proposal';
import { MDRMatrix } from '@/types/pricing';
import { generateProposalNumber } from '@/lib/utils';
import { isMdrMatrix } from '@/lib/guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const proposals = await prisma.proposal.findMany({ orderBy: { createdAt: 'desc' } });
    console.log(`[proposals] GET found=${proposals.length}`);
    return NextResponse.json(proposals);
  } catch (err) {
    console.error('[proposals] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const body = await req.json();
    const { data, mdrMatrix, costTable, marginConfig, proposalNumber } = body as {
      data: unknown;
      mdrMatrix: unknown;
      costTable?: unknown;
      marginConfig?: unknown;
      proposalNumber?: string;
    };

    const parsed = ProposalDataSchema.safeParse(data);
    if (!parsed.success) {
      console.warn('[proposals] POST invalid data:', parsed.error.flatten());
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    if (!isMdrMatrix(mdrMatrix)) {
      console.warn('[proposals] POST invalid mdrMatrix shape');
      return NextResponse.json({ error: 'Invalid mdrMatrix' }, { status: 400 });
    }

    const d = parsed.data;
    console.log(`[proposals] POST contratante="${d.contratanteNome}" cnpj=${d.contratanteCnpj}`);

    const proposal = await prisma.proposal.create({
      data: {
        proposalNumber:      proposalNumber ?? generateProposalNumber(),
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
        mcc:                 d.mcc              || null,
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
        costTable:           costTable ? JSON.stringify(costTable) : '{}',
        marginConfig:        marginConfig ? JSON.stringify(marginConfig) : '{}',
        validadeAte:         d.validadeAte,
        observacoes:         d.observacoes || '',
        status:              'draft',
      },
    });

    console.log(`[proposals] POST ok → id=${proposal.id} num=${proposal.proposalNumber}`);
    return NextResponse.json(proposal, { status: 201 });
  } catch (err) {
    console.error('[proposals] POST error:', err);
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
  }
}
