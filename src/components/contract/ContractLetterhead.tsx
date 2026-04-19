interface ContractLetterheadProps {
  forPrint?: boolean;
}

export function ContractLetterhead({ forPrint = false }: ContractLetterheadProps) {
  const base = forPrint
    ? { container: 'mb-8 pb-6', border: '2px solid #f72662' }
    : { container: 'mb-8 pb-6', border: '2px solid #f72662' };

  return (
    <div className={base.container}>
      <div className="flex items-start justify-between gap-6">
        {/* Left: company name */}
        <div className="flex items-start gap-4">
          <div>
            <p
              className="font-bold text-ink-950 leading-none tracking-tight"
              style={{ fontSize: '13pt' }}
            >
              REBORNPAY
            </p>
            <p className="text-xs text-ink-600 mt-0.5 font-medium">
              REBORN TECNOLOGIA E SERVIÇOS LTDA
            </p>
            <p className="text-xs text-ink-500 mt-0.5">
              CNPJ 59.627.567/0001-35
            </p>
          </div>
        </div>

        {/* Right: Contact info */}
        <div className="text-right text-xs text-ink-500 leading-relaxed">
          <p>Av. Brg. Faria Lima, 1572 · Sala 1022</p>
          <p>Ed. Barão de Rothschild · Jardim Paulistano</p>
          <p>São Paulo / SP · CEP 01451-917</p>
          <p className="mt-1">
            <span className="text-ink-700 font-medium">juridico@rebornpay.io</span>
            {' · '}
            <span>(11) 97420-5761</span>
          </p>
        </div>
      </div>

      {/* Brand divider */}
      <div
        className="mt-5"
        style={{ height: '2px', background: 'linear-gradient(90deg, #f72662 0%, #771339 60%, transparent 100%)' }}
      />
    </div>
  );
}
