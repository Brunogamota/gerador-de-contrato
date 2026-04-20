import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { generateContractNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const proposal = await prisma.proposal.findUnique({ where: { id: params.id } });
    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    if (proposal.contractId) {
      return NextResponse.json({ contractId: proposal.contractId });
    }

    const contractNumber = generateContractNumber();
    const today = new Date().toLocaleDateString('pt-BR');

    const [contract] = await prisma.$transaction([
      prisma.contract.create({
        data: {
          contractNumber,
          contratanteNome:     proposal.contratanteNome,
          contratanteCnpj:     proposal.contratanteCnpj,
          contratanteEndereco: proposal.contratanteEndereco,
          contratanteEmail:    proposal.contratanteEmail,
          contratanteTelefone: proposal.contratanteTelefone,
          repLegalNome:        proposal.repLegalNome,
          repLegalCpf:         proposal.repLegalCpf,
          repLegalRg:          proposal.repLegalRg,
          repLegalEmail:       proposal.repLegalEmail,
          repLegalTelefone:    proposal.repLegalTelefone,
          repLegalCargo:       proposal.repLegalCargo,
          dataInicio:          today,
          vigenciaMeses:       12,
          foro:                'São Paulo/SP',
          setup:               proposal.setup,
          feeTransacao:        proposal.feeTransacao,
          taxaAntifraude:      proposal.taxaAntifraude,
          taxaPix:             proposal.taxaPix,
          taxaPixOut:          proposal.taxaPixOut,
          taxaSplit:           proposal.taxaSplit,
          taxaEstorno:         proposal.taxaEstorno,
          taxaAntecipacao:     proposal.taxaAntecipacao,
          taxaPreChargeback:   proposal.taxaPreChargeback,
          taxaChargeback:      proposal.taxaChargeback,
          prazoRecebimento:    proposal.prazoRecebimento,
          valorMinimoMensal:   proposal.valorMinimoMensal,
          mdrMatrix:           proposal.mdrMatrix,
          status:              'draft',
        },
      }),
      prisma.proposal.update({
        where: { id: params.id },
        data: { status: 'aprovada' },
      }),
    ]);

    // Link contractId in a second update (after we have contract.id)
    await prisma.proposal.update({
      where: { id: params.id },
      data: { contractId: contract.id },
    });

    console.log(`[proposals:convert] proposal=${params.id} → contract=${contract.id} num=${contractNumber}`);
    return NextResponse.json({ contractId: contract.id });
  } catch (err) {
    console.error(`[proposals:convert] error:`, err);
    return NextResponse.json({ error: 'Failed to convert proposal' }, { status: 500 });
  }
}
