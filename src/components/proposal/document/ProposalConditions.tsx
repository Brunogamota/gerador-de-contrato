interface Props {
  observacoes?: string;
  hasIntlPricing?: boolean;
}

export function ProposalConditions({ observacoes, hasIntlPricing }: Props) {
  return (
    <div className="mb-6">
      <p className="font-semibold text-xs mb-2 uppercase tracking-wide">Condições Comerciais</p>
      <ul className="text-xs list-disc list-inside space-y-1 text-gray-700">
        <li>Os valores apresentados são válidos pelo prazo indicado no cabeçalho desta proposta.</li>
        <li>A aprovação desta proposta dará início ao processo de formalização contratual.</li>
        <li>Eventuais ajustes nas condições comerciais deverão ser solicitados antes da assinatura do contrato.</li>
        {hasIntlPricing && (
          <>
            <li>
              A operação exige a liberação de <strong>ao menos uma</strong> das liquidantes credenciadoras —
              adquirente <strong>Brasil</strong> ou adquirente <strong>Internacional</strong> — para entrar em
              funcionamento. Ambas podem operar simultaneamente quando aprovadas.
            </li>
            <li>
              O pagamento do setup (Brasil e/ou Internacional) será devido <strong>somente após a liberação
              e aprovação</strong> de alguma das liquidantes credenciadoras, não sendo cobrado antes do
              início efetivo das operações.
            </li>
          </>
        )}
      </ul>
      {observacoes && observacoes.trim() && (
        <div className="mt-3">
          <p className="font-medium text-xs mb-1">Observações:</p>
          <p className="text-xs text-gray-700 whitespace-pre-wrap">{observacoes}</p>
        </div>
      )}
    </div>
  );
}
