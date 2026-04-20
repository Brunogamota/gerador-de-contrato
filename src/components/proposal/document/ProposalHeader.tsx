interface Props {
  proposalNumber: string;
  validadeAte: string;
}

export function ProposalHeader({ proposalNumber, validadeAte }: Props) {
  return (
    <div className="mb-6 text-center">
      <p className="font-bold text-sm uppercase tracking-wide mb-2">
        PROPOSTA COMERCIAL
      </p>
      <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
        <span>
          <span className="font-medium text-gray-800">Nº </span>
          <span className="font-mono">{proposalNumber}</span>
        </span>
        <span className="text-gray-300">|</span>
        <span>
          <span className="font-medium text-gray-800">Válida até: </span>
          {validadeAte}
        </span>
      </div>
    </div>
  );
}
