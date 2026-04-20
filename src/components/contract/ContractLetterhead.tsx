export function ContractLetterhead() {
  return (
    <div className="mb-8 pb-6">
      <div className="flex items-start justify-between gap-6">
        {/* Left: Brand name + company info */}
        <div className="flex flex-col gap-1">
          <span
            className="font-black tracking-tight leading-none"
            style={{ fontSize: '26px', letterSpacing: '-0.04em', color: '#0a0a0a' }}
          >
            REBORN
          </span>
          <p className="text-xs font-medium" style={{ color: '#555', marginTop: '2px' }}>
            REBORN TECNOLOGIA E SERVIÇOS LTDA
          </p>
          <p className="text-xs" style={{ color: '#777' }}>
            CNPJ 59.627.567/0001-35
          </p>
        </div>

        {/* Right: Contact info */}
        <div className="text-right text-xs leading-relaxed" style={{ color: '#777' }}>
          <p>Av. Brg. Faria Lima, 1572 · Sala 1022</p>
          <p>Ed. Barão de Rothschild · Jardim Paulistano</p>
          <p>São Paulo / SP · CEP 01451-917</p>
          <p className="mt-1">
            <span style={{ color: '#333', fontWeight: 500 }}>juridico@rebornpay.io</span>
            {' · '}
            <span>(11) 97420-5761</span>
          </p>
        </div>
      </div>

      {/* Brand gradient divider */}
      <div
        className="mt-5"
        style={{
          height: '2px',
          background: 'linear-gradient(90deg, #f72662 0%, #771339 60%, transparent 100%)',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        } as React.CSSProperties}
      />
    </div>
  );
}
