interface Props {
  proposalNumber: string;
  validadeAte: string;
}

export function ProposalHeader({ proposalNumber, validadeAte }: Props) {
  return (
    <div className="mb-8">
      <h1
        className="font-extrabold tracking-tight text-ink-950 mb-0.5"
        style={{ fontSize: '18pt', letterSpacing: '-0.02em' }}
      >
        Proposta Comercial
      </h1>
      <p style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500 }}>
        Infraestrutura de Pagamentos
      </p>
      <div
        style={{
          height: '3px',
          background: 'linear-gradient(90deg, #f72662 0%, #771339 55%, transparent 100%)',
          borderRadius: '2px',
          marginBottom: '12px',
        }}
      />
      <div className="flex items-center gap-6 text-xs" style={{ color: '#6b7280' }}>
        <span>
          <span style={{ fontWeight: 600, color: '#374151' }}>Nº </span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{proposalNumber}</span>
        </span>
        <span style={{ color: '#d1d5db' }}>|</span>
        <span>
          <span style={{ fontWeight: 600, color: '#374151' }}>Válida até: </span>
          {validadeAte}
        </span>
      </div>
    </div>
  );
}
