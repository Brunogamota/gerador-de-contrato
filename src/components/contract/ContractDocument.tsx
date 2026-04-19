'use client';

import { ContractData } from '@/types/contract';
import { MDRMatrix, BRANDS, INSTALLMENTS, BRAND_LABELS, BrandName, InstallmentNumber } from '@/types/pricing';
import { ContractLetterhead } from './ContractLetterhead';

interface ContractDocumentProps {
  contractData: ContractData;
  mdrMatrix: MDRMatrix;
  contractNumber: string;
}

function mdrVal(matrix: MDRMatrix, brand: BrandName, inst: number): string {
  const v = matrix[brand][inst as InstallmentNumber]?.finalMdr;
  return v ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '-';
}

function cur(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export function ContractDocument({ contractData: d, mdrMatrix, contractNumber }: ContractDocumentProps) {
  const td = 'border border-gray-400 px-2 py-1 text-xs';
  const th = `${td} font-semibold bg-gray-100`;

  return (
    <div
      id="contract-document"
      className="bg-white font-serif text-xs text-gray-900 leading-relaxed p-10 max-w-4xl mx-auto"
      style={{ fontFamily: 'Times New Roman, serif', fontSize: '10pt', lineHeight: '1.6' }}
    >
      {/* Letterhead */}
      <ContractLetterhead forPrint />


      <p className="text-center font-bold text-sm uppercase tracking-wide mb-6">
        CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GATEWAY E ORQUESTRADOR DE PAGAMENTO COM SOLUÇÃO ANTIFRAUDE
      </p>

      {/* Quadro-Resumo */}
      <p className="font-bold text-xs uppercase mb-2">QUADRO-RESUMO</p>
      <table className="w-full border-collapse mb-6 text-xs">
        <tbody>
          <tr><td className={th} style={{width:'30%'}}>Nº do Contrato</td><td className={td}>{contractNumber}</td></tr>
          <tr><td className={th}>CONTRATANTE</td><td className={td}>{d.contratanteNome}</td></tr>
          <tr><td className={th}>CNPJ/CPF</td><td className={td}>{d.contratanteCnpj}</td></tr>
          <tr><td className={th}>Endereço</td><td className={td}>{d.contratanteEndereco}</td></tr>
          <tr><td className={th}>E-mail</td><td className={td}>{d.contratanteEmail}</td></tr>
          <tr><td className={th}>Telefone</td><td className={td}>{d.contratanteTelefone}</td></tr>
          <tr><td className={th}>CONTRATADA</td><td className={td}>REBORN TECNOLOGIA E SERVIÇOS LTDA</td></tr>
          <tr><td className={th}>CNPJ</td><td className={td}>59.627.567/0001-35</td></tr>
          <tr><td className={th}>Endereço</td><td className={td}>Avenida Brg. Faria Lima, 1572, Sala 1022 - Edifício Barão de Rothschild - Jardim Paulistano, São Paulo/SP, CEP 01451-917</td></tr>
          <tr><td className={th}>E-mail</td><td className={td}>juridico@rebornpay.io</td></tr>
          <tr><td className={th}>Telefone</td><td className={td}>011 97420-5761</td></tr>
          <tr><td className={th}>Serviços Contratados</td><td className={td}>Infraestrutura de Pagamento e Solução Antifraude</td></tr>
          <tr><td className={th}>Data de Início</td><td className={td}>{d.dataInicio}</td></tr>
          <tr><td className={th}>Vigência</td><td className={td}>{d.vigenciaMeses} meses, renovação automática</td></tr>
          <tr><td className={th}>Foro</td><td className={td}>Comarca de {d.foro}</td></tr>
        </tbody>
      </table>

      {/* Corpo do contrato */}
      <Clause title="CLÁUSULA PRIMEIRA – DAS PARTES E DO PREÂMBULO">
        <p className="mb-2 text-xs">Pelo presente instrumento particular e na melhor forma de direito, as Partes abaixo qualificadas, de comum acordo e em boa-fé, celebram o presente Contrato de Prestação de Serviços de Gateway e Orquestrador de Pagamento com Solução Antifraude («Contrato»), que se regerá pelas cláusulas e condições seguintes.</p>
        <p className="mb-2 text-xs"><strong>REBORN TECNOLOGIA E SERVIÇOS LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 59.627.567/0001-35, com sede na Avenida Brg. Faria Lima, 1572, Sala 1022, Edifício Barão de Rothschild, Jardim Paulistano, São Paulo/SP, CEP 01451-917, doravante denominada simplesmente <strong>«REBORN»</strong>;</p>
        <p className="mb-2 text-xs">E <strong>{d.contratanteNome}</strong>, inscrita no CNPJ sob o nº {d.contratanteCnpj}, com sede na {d.contratanteEndereco}, doravante denominada simplesmente <strong>«CONTRATANTE»</strong>.</p>
        <p className="mb-2 text-xs">REBORN e CONTRATANTE, individualmente denominadas «Parte» e, em conjunto, «Partes».</p>
        <p className="font-bold mb-1 text-xs">CONSIDERANDO QUE:</p>
        <ul className="list-disc ml-4 mb-2 text-xs space-y-1">
          <li>A REBORN é empresa especializada em soluções para o mercado de pagamentos digitais, oferecendo infraestrutura tecnológica avançada para processamento de pagamentos, gestão de fluxos financeiros e soluções de gateway/orquestrador de pagamento com antifraude;</li>
          <li>O CONTRATANTE possui interesse em contratar os serviços e soluções tecnológicas oferecidos pela REBORN para otimizar suas operações comerciais e financeiras;</li>
          <li>As Partes celebram este instrumento de forma livre, consciente e sem qualquer vício de vontade.</li>
        </ul>
      </Clause>

      <Clause title="CLÁUSULA SEGUNDA – DO OBJETO">
        <Item n="2.1">O presente Contrato tem por objeto a prestação, pela REBORN ao CONTRATANTE, de serviços de Gateway e Orquestrador de Pagamento com Solução Antifraude, conforme condições detalhadas no Anexo I – Descrição dos Serviços.</Item>
        <Item n="2.2">Os serviços compreendem: (i) gateway de pagamento com suporte a cartão de crédito, débito, PIX, boleto bancário e demais meios que vierem a ser disponibilizados; (ii) orquestração inteligente de pagamentos com roteamento entre múltiplos adquirentes; (iii) motor antifraude integrado com análise comportamental em tempo real; (iv) dashboard de gestão, relatórios e conciliação financeira; (v) split de pagamentos entre múltiplos recebedores (subsellers); (vi) webhooks e integrações via API REST.</Item>
        <Item n="2.3">O processamento de transações de cartão de crédito e débito pela Plataforma REBORN ocorre exclusivamente por meio da modalidade split de pagamentos. Para habilitar o processamento de cartão, o CONTRATANTE deverá: (i) cadastrar cada recebedor final como subseller na Plataforma REBORN, fornecendo todos os dados cadastrais, documentos e informações solicitadas; e (ii) garantir que cada subseller esteja devidamente habilitado e em conformidade com as regras das bandeiras de cartão e com as políticas de risco da REBORN. O descumprimento deste requisito impedirá o processamento de transações de cartão pelo CONTRATANTE.</Item>
        <Item n="2.4">A contratação dos serviços implica aceitação plena e irrestrita das condições estabelecidas neste instrumento e em todos os seus anexos, os quais são parte integrante deste Contrato.</Item>
        <Item n="2.5">Quaisquer serviços adicionais não previstos neste Contrato deverão ser formalizados mediante aditamento escrito assinado por ambas as Partes.</Item>
      </Clause>

      <Clause title="CLÁUSULA TERCEIRA – DA VIGÊNCIA">
        <Item n="3.1">Este Contrato entra em vigor na data de sua assinatura pelas Partes e vigorará por {d.vigenciaMeses} meses, renovando-se automaticamente por iguais e sucessivos períodos, salvo manifestação contrária de qualquer das Partes com antecedência mínima de 60 (sessenta) dias da data de renovação, por escrito.</Item>
        <Item n="3.2">A vigência específica dos serviços será contada a partir da data de ativação da Plataforma REBORN para o CONTRATANTE, conforme comunicação formal enviada à CONTRATANTE.</Item>
        <Item n="3.3">O prazo mínimo de permanência é de {d.vigenciaMeses} meses contados da data de ativação.</Item>
      </Clause>

      <Clause title="CLÁUSULA QUARTA – DA REMUNERAÇÃO E REPASSES">
        <Item n="4.1">A remuneração devida pelo CONTRATANTE à REBORN pela prestação dos serviços será deduzida automaticamente dos valores transacionados na Plataforma REBORN, conforme taxas, condições e prazos de repasse estabelecidos no Anexo II – Remuneração.</Item>
        <Item n="4.1.1">A antecipação de recebíveis das transações processadas na Plataforma REBORN é operacionalizada pelas instituições financeiras liquidantes parceiras da REBORN, de forma automática, observando o seguinte modelo de liquidação: (i) 80% (oitenta por cento) do valor líquido de cada transação aprovada é antecipado e repassado ao CONTRATANTE em D+2 (dois dias úteis após a data da transação); (ii) o saldo remanescente de 20% (vinte por cento) é liquidado no fluxo original da transação, conforme os prazos regulatórios e operacionais aplicáveis a cada meio de pagamento e adquirente.</Item>
        <Item n="4.1.2">A antecipação descrita no item 4.1.1 é realizada diretamente pelas instituições financeiras liquidantes parceiras da REBORN, sendo que a REBORN atua como facilitadora tecnológica do processo. O CONTRATANTE reconhece expressamente que os prazos, condições e eventuais custos da antecipação são determinados pelas liquidantes e podem estar sujeitos a alteração mediante comunicação prévia. A REBORN não se responsabiliza por atrasos ou indisponibilidades de liquidação decorrentes de falhas, interrupções ou alterações operacionais das instituições financeiras liquidantes, do BACEN, das adquirentes ou de quaisquer outros participantes da cadeia de liquidação.</Item>
        <Item n="4.1.3">Os 20% (vinte por cento) remanescentes serão repassados ao CONTRATANTE no fluxo original da transação, deduzidos de eventuais chargebacks, estornos, taxas, multas e quaisquer outros débitos do CONTRATANTE junto à REBORN apurados até a data da liquidação do saldo residual. O CONTRATANTE desde já autoriza a REBORN a efetuar tais deduções de forma automática, sem necessidade de notificação prévia.</Item>
        <Item n="4.1.4">O modelo de antecipação automática de 80% em D+2 aplica-se às transações de cartão de crédito e débito processadas pelas adquirentes parceiras. Transações PIX e boleto bancário seguem os prazos de liquidação próprios de cada modalidade, conforme estabelecido no Anexo II e nas regras do SPI e do SPB. Eventuais ajustes no modelo de antecipação decorrentes de exigências regulatórias ou operacionais das liquidantes serão comunicados ao CONTRATANTE com antecedência mínima de 5 (cinco) dias úteis.</Item>
        <Item n="4.2">O CONTRATANTE autoriza expressamente a REBORN a compensar quaisquer valores devidos (incluindo taxas, multas, indenizações, chargebacks e estornos) com os valores a serem repassados ao CONTRATANTE.</Item>
        <Item n="4.3">Caso o volume de transações processadas ou o saldo disponível do CONTRATANTE seja insuficiente para cobrir os valores devidos, o CONTRATANTE deverá efetuar o pagamento da diferença em até 5 (cinco) dias úteis após notificação da REBORN.</Item>
        <Item n="4.4">O não pagamento no prazo estipulado implicará incidência de: (i) multa moratória de 2% (dois por cento) sobre o valor em aberto; (ii) juros de mora de 1% (um por cento) ao mês, calculados pro rata die; (iii) correção monetária pelo IGPM/FGV; (iv) honorários advocatícios de 20% (vinte por cento) em caso de cobrança judicial ou extrajudicial.</Item>
        <Item n="4.5">Os valores e taxas serão reajustados anualmente, na data de aniversário do Contrato, com base na variação positiva do IGPM/FGV acumulado nos 12 (doze) meses anteriores, ou pelo IPCA/IBGE, prevalecendo o de maior variação.</Item>
        <Item n="4.6">A REBORN reserva-se o direito de alterar sua tabela de tarifas mediante notificação ao CONTRATANTE com antecedência mínima de 30 (trinta) dias, facultando ao CONTRATANTE rescisão sem multa dentro de 10 (dez) dias do recebimento da notificação caso não concorde com os novos valores.</Item>
      </Clause>

      <Clause title="CLÁUSULA QUINTA – DOS DIREITOS E OBRIGAÇÕES">
        <Item n="5.1">Obrigações da REBORN:</Item>
        <Item n="5.1.1">Disponibilizar a Plataforma REBORN e os serviços de Gateway/Orquestrador e Antifraude de acordo com as condições estabelecidas neste Contrato e seus Anexos.</Item>
        <Item n="5.1.2">Empregar os melhores esforços para garantir a segurança, estabilidade e disponibilidade da Plataforma REBORN, conforme os SLAs definidos no Anexo I.</Item>
        <Item n="5.1.3">Processar as transações e repassar os valores ao CONTRATANTE nos prazos estabelecidos no Anexo II.</Item>
        <Item n="5.1.4">Notificar o CONTRATANTE sobre incidentes de segurança, indisponibilidades não programadas e manutenções planejadas com a antecedência mínima prevista neste Contrato.</Item>
        <Item n="5.1.5">Cumprir com a legislação aplicável às suas atividades, incluindo as normas do Banco Central do Brasil, LGPD, PLD/FT e demais regulamentações pertinentes.</Item>
        <Item n="5.1.6">Manter equipe de suporte técnico disponível nos horários e canais definidos na Cláusula Décima Segunda.</Item>
        <Item n="5.1.7">Tratar os dados pessoais do CONTRATANTE e de seus Consumidores Finais em estrita conformidade com a LGPD e com as instruções do CONTRATANTE na qualidade de Operadora.</Item>
        <Item n="5.2">Obrigações do CONTRATANTE:</Item>
        <Item n="5.2.1">Fornecer à REBORN todas as informações, documentos e dados necessários para seu credenciamento e para a utilização dos serviços, garantindo a veracidade, completude e atualização permanente de tais dados. A prestação de informações falsas ou desatualizadas constitui justa causa para rescisão imediata.</Item>
        <Item n="5.2.2">Utilizar os serviços exclusivamente de forma lícita, em conformidade com este Contrato, seus Anexos e a legislação aplicável.</Item>
        <Item n="5.2.3">Ser o único e exclusivo responsável pela relação comercial com seus Consumidores Finais, incluindo entrega de produtos/serviços, suporte pós-venda, devoluções, cancelamentos e estornos.</Item>
        <Item n="5.2.4">Manter seus sistemas, APIs e infraestrutura de integração com a Plataforma REBORN seguros e atualizados.</Item>
        <Item n="5.2.5">Comunicar imediatamente à REBORN, por escrito, qualquer suspeita de fraude, irregularidade, uso indevido dos serviços ou comprometimento de credenciais de acesso.</Item>
        <Item n="5.2.6">Manter taxa de chargeback abaixo dos limites estabelecidos neste Contrato e pelas bandeiras de cartão.</Item>
        <Item n="5.2.7">Não praticar qualquer ato que possa comprometer a reputação, operação ou integridade da Plataforma REBORN.</Item>
        <Item n="5.2.8">Manter regularidade fiscal, trabalhista e previdenciária durante toda a vigência contratual.</Item>
        <Item n="5.2.9">Designar ao menos um representante responsável («Ponto Focal») para interlocução com a REBORN, informando seus dados à REBORN e mantendo-os atualizados.</Item>
      </Clause>

      <Clause title="CLÁUSULA SEXTA – DA CONFORMIDADE, COMPLIANCE E KYC">
        <Item n="6.1">O CONTRATANTE declara e garante que suas atividades comerciais estão em plena conformidade com a legislação vigente e que não se enquadra nas atividades proibidas listadas na Cláusula Sétima e no Anexo III.</Item>
        <Item n="6.2">O CONTRATANTE compromete-se a manter suas operações em estrita conformidade com as normas de Prevenção à Lavagem de Dinheiro e ao Financiamento do Terrorismo (PLD/FT), LGPD e demais regulamentações aplicáveis.</Item>
        <Item n="6.3">A REBORN poderá, a qualquer tempo e a seu exclusivo critério, solicitar ao CONTRATANTE documentos, declarações e informações adicionais para fins de KYC (Know Your Customer), Enhanced Due Diligence (EDD) ou monitoramento de risco, devendo o CONTRATANTE fornecê-los no prazo de 5 (cinco) dias úteis.</Item>
        <Item n="6.4">A recusa ou demora injustificada no fornecimento dos documentos e informações solicitados facultará à REBORN a suspensão imediata dos serviços sem ônus.</Item>
        <Item n="6.5">O CONTRATANTE declara, sob as penas da lei, que: (i) não figura em listas restritivas nacionais ou internacionais (OFAC, ONU, COAF etc.); (ii) não possui vínculos com organizações criminosas; (iii) seus sócios, administradores e beneficiários finais são pessoas idôneas; (iv) os recursos utilizados em suas operações têm origem lícita.</Item>
        <Item n="6.6">O CONTRATANTE autoriza expressamente a REBORN a compartilhar informações sobre suas operações com autoridades regulatórias, judiciais ou administrativas competentes, sem necessidade de prévia notificação, quando assim exigido por lei ou por determinação oficial.</Item>
      </Clause>

      <Clause title="CLÁUSULA SÉTIMA – DAS ATIVIDADES PROIBIDAS">
        <Item n="7.1">É expressamente vedado ao CONTRATANTE utilizar os serviços da REBORN para processar transações relacionadas a:</Item>
        <ul className="list-disc ml-4 mb-2 text-xs space-y-0.5">
          <li>Venda de produtos ou serviços ilegais, falsificados, roubados ou que violem direitos de propriedade intelectual;</li>
          <li>Jogos de azar, apostas ou loterias não autorizados pelos órgãos competentes;</li>
          <li>Criptomoedas, tokens ou ativos virtuais não regulamentados pelo Banco Central do Brasil;</li>
          <li>Conteúdo pornográfico, erótico ou de natureza sexual;</li>
          <li>Armas de fogo, munições, explosivos ou acessórios correlatos sem autorização;</li>
          <li>Drogas, entorpecentes, substâncias psicoativas ilícitas ou precursores químicos;</li>
          <li>Pirâmides financeiras, esquemas Ponzi ou qualquer captação irregular de recursos;</li>
          <li>Lavagem de dinheiro, ocultação de bens ou financiamento ao terrorismo;</li>
          <li>Serviços financeiros, de crédito, câmbio ou seguros não autorizados pelo Banco Central do Brasil ou pela SUSEP;</li>
          <li>Suplementos, medicamentos ou produtos de saúde sem registro ou comercialização irregular perante a ANVISA;</li>
          <li>Produtos e serviços que façam uso de táticas de marketing enganosas, cobrança não autorizada ou recorrência oculta ao consumidor;</li>
          <li>Qualquer atividade que viole a legislação brasileira, normas do BACEN, do COAF, do Código de Defesa do Consumidor ou as regras das bandeiras de cartão.</li>
        </ul>
        <Item n="7.2">A REBORN reserva-se o direito de recusar, bloquear ou cancelar transações suspeitas, a seu exclusivo critério, sem necessidade de notificação prévia ao CONTRATANTE.</Item>
        <Item n="7.3">A violação de qualquer disposição desta cláusula constitui justa causa para rescisão imediata do Contrato, sujeitando o CONTRATANTE às penalidades previstas na Cláusula Oitava, sem prejuízo de responsabilização criminal.</Item>
      </Clause>

      <Clause title="CLÁUSULA OITAVA – DAS PENALIDADES, MULTAS E CHARGEBACKS">
        <p className="font-semibold text-xs mb-1">8.1. Multas Gerais</p>
        <Item n="8.1.1">Pelo descumprimento de qualquer obrigação contratual, a Parte infratora estará sujeita ao pagamento de multa de 10% (dez por cento) sobre o valor das transações processadas no mês anterior, sem prejuízo da obrigação de reparar eventuais danos causados.</Item>
        <Item n="8.1.2">Em caso de utilização dos serviços para atividades proibidas (Cláusula Sétima), o CONTRATANTE estará sujeito a: (i) multa de 50% (cinquenta por cento) sobre o valor total das transações irregulares; (ii) rescisão imediata do Contrato; (iii) retenção integral dos saldos disponíveis para ressarcimento de danos.</Item>
        <Item n="8.1.3">O não pagamento dos valores devidos acarretará: (i) multa moratória de 2% (dois por cento); (ii) juros de mora de 1% (um por cento) ao mês pro rata die; (iii) correção pelo IGPM/FGV; (iv) honorários advocatícios de 20% (vinte por cento).</Item>
        <p className="font-semibold text-xs mb-1 mt-2">8.2. Multa por Dolo, Má-fé e Operação Ilícita Comprovada</p>
        <Item n="8.2.1">Para os fins desta cláusula, consideram-se hipóteses de dolo, má-fé ou operação ilícita, de forma exemplificativa e não exaustiva: (i) apresentação de documentos falsos ou adulterados no processo de onboarding ou em qualquer momento da vigência contratual; (ii) utilização dos serviços para processamento de transações fictícias, triangulação ou lavagem de dinheiro; (iii) criação de transações fraudulentas para obtenção de crédito, liquidez ou vantagem indevida; (iv) comprometimento intencional da Plataforma REBORN; (v) operação de atividades proibidas de forma deliberada e reiterada; (vi) falsa declaração de conformidade regulatória.</Item>
        <Item n="8.2.2">A comprovação do dolo ou má-fé poderá se dar por qualquer meio de prova em direito admitido, incluindo análise de padrões transacionais, auditoria, laudos técnicos, decisões administrativas ou judiciais.</Item>
        <Item n="8.2.3">A multa prevista nesta cláusula é exigível de imediato, independentemente de interpelação judicial ou extrajudicial, podendo ser compensada diretamente com saldos do CONTRATANTE na Plataforma REBORN.</Item>
        <p className="font-semibold text-xs mb-1 mt-2">8.3. Suspensão dos Serviços</p>
        <Item n="8.3.1">A REBORN poderá suspender imediatamente a prestação dos serviços, sem necessidade de notificação prévia, nas hipóteses de: (i) inadimplência superior a 5 (cinco) dias úteis; (ii) suspeita fundada de fraude ou operação ilícita; (iii) taxa de chargeback superior a 1% (um por cento) no mês; (iv) determinação de autoridade competente; (v) violação de atividades proibidas; (vi) indícios de lavagem de dinheiro ou financiamento ao terrorismo.</Item>
        <Item n="8.3.2">A suspensão não exime o CONTRATANTE do cumprimento de suas obrigações contratuais.</Item>
        <Item n="8.3.3">A reativação dos serviços após suspensão está condicionada à regularização da situação que originou a suspensão, ao pagamento de todos os valores devidos e ao pagamento de taxa de reativação conforme Anexo II.</Item>
        <p className="font-semibold text-xs mb-1 mt-2">8.4. Chargebacks, Pré-Chargebacks e Cobrança por Invoice</p>
        <Item n="8.4.1">O CONTRATANTE é integralmente responsável por todos os chargebacks e estornos decorrentes de suas transações, sejam eles originados por fraude, insatisfação do consumidor, produto não entregue, cobrança indevida ou qualquer outra razão.</Item>
        <Item n="8.4.2">Para cada pré-chargeback e para cada chargeback efetivamente registrado, serão cobrados: (i) o valor integral da transação contestada; e (ii) a taxa unitária por evento cujos valores estão estabelecidos na Proposta Comercial constante do Anexo II deste Contrato.</Item>
        <Item n="8.4.3">Os valores devidos a título de pré-chargeback, chargeback e respectivas taxas serão consolidados semanalmente pela REBORN e enviados ao CONTRATANTE por meio de invoice (fatura) emitida toda segunda-feira, com vencimento em até 3 (três) dias úteis da data de emissão. O envio será realizado para o e-mail indicado no Quadro-Resumo, sendo considerado recebido automaticamente no prazo de 24 horas da transmissão.</Item>
        <Item n="8.4.4">O não pagamento da invoice no prazo estipulado no item 8.4.3 sujeitará o CONTRATANTE, de forma imediata e cumulativa, às seguintes consequências: (i) suspensão imediata do processamento de novas transações, sem aviso prévio; (ii) multa moratória de 2% sobre o valor em aberto; (iii) juros de mora de 1% ao mês pro rata die; (iv) correção pelo IGPM/FGV; (v) inscrição do débito em cadastros de inadimplentes (SPC, Serasa e similares); (vi) protesto extrajudicial pelo valor total em aberto; (vii) honorários advocatícios de 20% em caso de cobrança judicial ou extrajudicial.</Item>
        <Item n="8.4.5">O CONTRATANTE desde já autoriza expressamente que, na hipótese de inadimplência de qualquer invoice por prazo superior a 5 (cinco) dias corridos: (i) a REBORN poderá reter integralmente os repasses de transações aprovadas até cobertura integral do débito; (ii) a REBORN poderá constituir ou reforçar a Reserva de Segurança no montante equivalente a até 6 (seis) vezes o valor médio semanal de chargebacks apurado nos últimos 30 (trinta) dias; (iii) todos os saldos retidos poderão ser compensados de ofício com os débitos em aberto.</Item>
        <Item n="8.4.6">O CONTRATANTE reconhece que os valores de pré-chargeback e chargeback constantes da invoice constituem dívida líquida, certa e exigível, nos termos do art. 784 do Código de Processo Civil, podendo ser objeto de execução extrajudicial direta.</Item>
        <Item n="8.4.7">Taxa de chargeback superior a 1% (um por cento) em um mês ou superior a 0,5% (zero vírgula cinco por cento) por 3 (três) meses consecutivos implicará: (i) suspensão imediata dos serviços; (ii) constituição ou reforço de Reserva de Segurança; (iii) revisão obrigatória das condições comerciais.</Item>
        <Item n="8.4.8">Taxa de chargeback superior a 2% (dois por cento) por 2 (dois) meses consecutivos constitui justa causa para rescisão imediata, sem prejuízo da cobrança de todos os valores devidos.</Item>
        <Item n="8.4.9">A REBORN disponibilizará ao CONTRATANTE mecanismos de contestação de chargebacks, mas não garante resultado favorável. O ônus da prova em disputas de chargeback é exclusivamente do CONTRATANTE.</Item>
        <p className="font-semibold text-xs mb-1 mt-2">8.5. Rescisão e Multa Rescisória</p>
        <Item n="8.5.1">Em caso de rescisão unilateral pelo CONTRATANTE sem justa causa antes do prazo mínimo de 12 meses, será devida multa compensatória equivalente a 30% (trinta por cento) sobre o valor médio das taxas pagas nos últimos 6 (seis) meses, multiplicado pelo número de meses restantes do prazo mínimo, com valor mínimo equivalente a 2 (dois) meses de taxas médias.</Item>
        <Item n="8.5.2">A multa rescisória prevista nesta cláusula não se aplica nas hipóteses de rescisão por justa causa imputável à REBORN.</Item>
        <p className="font-semibold text-xs mb-1 mt-2">8.6. Procedimento de Defesa de Chargeback (Cartão)</p>
        <Item n="8.6.1">Ao receber notificação de chargeback de transação com cartão de crédito ou débito, a REBORN comunicará o CONTRATANTE por e-mail ou pela Plataforma REBORN no prazo de até 2 (dois) dias úteis da ciência do evento, descrevendo o valor contestado, o motivo do chargeback e o prazo disponível para apresentação de defesa.</Item>
        <Item n="8.6.2">O CONTRATANTE terá o prazo de 7 (sete) dias corridos contados da notificação da REBORN para apresentar documentos de defesa (comprovante de entrega, nota fiscal, comunicação com o portador, política de cancelamento, logs de acesso, capturas de tela e demais evidências pertinentes). Não havendo manifestação dentro do prazo, a REBORN considerará o chargeback aceito e debitará o valor do CONTRATANTE automaticamente.</Item>
        <Item n="8.6.3">Durante o período de análise da defesa pela adquirente ou bandeira, o valor integral da transação contestada ficará bloqueado no saldo do CONTRATANTE na Plataforma REBORN. O desbloqueio ocorrerá exclusivamente nas seguintes hipóteses: (i) aceitação da defesa pela adquirente ou bandeira; ou (ii) decurso do prazo de análise sem pronunciamento da adquirente, a critério exclusivo da REBORN. Em caso de rejeição da defesa, o valor bloqueado será definitivamente apropriado pela REBORN para cobertura do chargeback.</Item>
        <Item n="8.6.4">Os prazos de análise e decisão sobre a defesa são determinados exclusivamente pelas adquirentes e bandeiras de cartão, podendo variar entre 30 (trinta) e 120 (cento e vinte) dias corridos a depender do motivo do chargeback e do regulamento aplicável. A REBORN não possui controle sobre esses prazos e não se responsabiliza por eventuais demoras.</Item>
        <Item n="8.6.5">Caso a adquirente acate a defesa apenas parcialmente, o valor aceito será liberado ao CONTRATANTE e o valor remanescente debitado, na proporção determinada pela adquirente.</Item>
        <p className="font-semibold text-xs mb-1 mt-2">8.7. Procedimento de Defesa de MED (Meios Eletrônicos de Disputa – PIX)</p>
        <Item n="8.7.1">O MED (Mecanismo Especial de Devolução) é o procedimento regulamentado pelo Banco Central do Brasil para contestação de transações PIX realizadas mediante fraude ou erro. Ao receber solicitação de MED originada pelo banco da parte pagadora, a REBORN comunicará o CONTRATANTE imediatamente, por e-mail ou pela Plataforma REBORN, informando o valor contestado, os dados da transação e o prazo para manifestação.</Item>
        <Item n="8.7.2">Ao receber a notificação de MED, o valor integral da transação PIX contestada será imediatamente bloqueado no saldo do CONTRATANTE na Plataforma REBORN, conforme determinação do Banco Central do Brasil e das normas do SPI (Sistema de Pagamentos Instantâneos), independentemente de qualquer anuência ou contestação pelo CONTRATANTE.</Item>
        <Item n="8.7.3">O CONTRATANTE terá o prazo de 7 (sete) dias corridos contados da notificação da REBORN para apresentar sua defesa e documentos comprobatórios da legitimidade da transação. Não havendo manifestação no prazo, o valor bloqueado será devolvido ao pagador contestante de forma automática, nos termos da regulamentação do BACEN.</Item>
        <Item n="8.7.4">A análise da defesa do MED será conduzida pela REBORN em conjunto com a instituição financeira liquidante, observando os prazos e critérios definidos pelo Banco Central do Brasil. O prazo regulatório para conclusão do MED é de até 7 (sete) dias corridos a partir do recebimento da contestação pela instituição do recebedor, podendo ser prorrogado em hipóteses excepcionais previstas na regulamentação do BACEN.</Item>
        <Item n="8.7.5">O desbloqueio do valor retido em MED ocorrerá exclusivamente nas seguintes hipóteses: (i) aceitação da defesa pela REBORN e pela instituição liquidante, com base nas evidências apresentadas pelo CONTRATANTE, caso em que o valor retorna integralmente ao saldo disponível; ou (ii) decisão da autoridade regulatória competente favorável ao CONTRATANTE. Em caso de rejeição da defesa, o valor bloqueado será devolvido ao pagador contestante, sendo debitado definitivamente do saldo ou da Reserva de Segurança do CONTRATANTE.</Item>
        <Item n="8.7.6">O CONTRATANTE reconhece que o bloqueio imediato de valores em MED é imposição regulatória do Banco Central do Brasil e não constitui ato discricionário da REBORN, sendo vedado ao CONTRATANTE responsabilizar a REBORN por eventuais prejuízos decorrentes do bloqueio durante o período de análise.</Item>
      </Clause>

      <Clause title="CLÁUSULA NONA – DA RESERVA DE SEGURANÇA">
        <Item n="9.1">A REBORN poderá constituir e/ou ajustar, a qualquer tempo, Reserva de Segurança (Rolling Reserve) sobre os valores do CONTRATANTE na Plataforma REBORN, nas seguintes hipóteses: (i) taxa de chargeback acima dos limites estabelecidos; (ii) suspeita de fraude ou irregularidade; (iii) aumento significativo no volume de transações; (iv) a critério da área de risco da REBORN.</Item>
        <Item n="9.2">O percentual e prazo da Reserva de Segurança serão definidos no Anexo II ou por notificação específica ao CONTRATANTE.</Item>
        <Item n="9.3">Em caso de rescisão contratual por qualquer motivo, os valores retidos na Reserva de Segurança somente serão liberados após 180 (cento e oitenta) dias corridos da última transação processada, deduzidos eventuais chargebacks, multas e valores devidos à REBORN.</Item>
        <Item n="9.4">O CONTRATANTE desde já autoriza a retenção e compensação dos valores da Reserva de Segurança com quaisquer débitos que venha a ter perante a REBORN.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA – DA CONFIDENCIALIDADE E PROPRIEDADE INTELECTUAL">
        <Item n="10.1">As Partes comprometem-se a manter sigilo absoluto sobre todas as Informações Confidenciais, entendidas como quaisquer dados, informações, documentos, estratégias comerciais, informações técnicas, dados de clientes, metodologias, modelos de negócio e know-how a que venham a ter acesso em decorrência deste Contrato.</Item>
        <Item n="10.2">A obrigação de confidencialidade permanecerá em vigor durante toda a vigência deste Contrato e pelo prazo adicional de 5 (cinco) anos após seu término, independentemente do motivo.</Item>
        <Item n="10.3">Não são consideradas Informações Confidenciais aquelas que: (i) sejam ou se tornem publicamente conhecidas sem culpa da Parte receptora; (ii) já fossem conhecidas pela Parte receptora antes da celebração deste Contrato; (iii) sejam reveladas por determinação legal ou judicial, desde que a Parte receptora notifique imediatamente a outra Parte.</Item>
        <Item n="10.4">O descumprimento da obrigação de confidencialidade sujeitará a Parte infratora ao pagamento de multa de R$ 50.000,00 (cinquenta mil reais) por evento, sem prejuízo de indenização por perdas e danos.</Item>
        <Item n="10.5">Todos os direitos de propriedade intelectual sobre a Plataforma REBORN, suas tecnologias, algoritmos, modelos de antifraude, APIs, interfaces, marcas e demais ativos intangíveis são de titularidade exclusiva da REBORN.</Item>
        <Item n="10.6">Este Contrato concede ao CONTRATANTE apenas uma licença não exclusiva, não transferível, não sublicenciável e revogável de uso da Plataforma REBORN durante a vigência contratual, exclusivamente para os fins previstos neste instrumento.</Item>
        <Item n="10.7">É vedado ao CONTRATANTE: (i) realizar engenharia reversa da Plataforma REBORN; (ii) copiar, reproduzir ou redistribuir a tecnologia da REBORN; (iii) utilizar a marca REBORN sem prévia autorização escrita.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA PRIMEIRA – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)">
        <Item n="11.1">Para os fins deste Contrato e nos termos da Lei nº 13.709/2018 (LGPD), o CONTRATANTE é considerado CONTROLADOR dos dados pessoais de seus Consumidores Finais, e a REBORN atua como OPERADORA, processando dados exclusivamente para a execução dos serviços contratados e conforme as instruções do CONTRATANTE.</Item>
        <Item n="11.2">Como Operadora, a REBORN compromete-se a: (i) processar dados pessoais apenas conforme as instruções do CONTRATANTE e para as finalidades previstas neste Contrato; (ii) implementar medidas técnicas e organizacionais adequadas para proteção dos dados; (iii) garantir que as pessoas autorizadas a tratar dados estejam sujeitas a obrigações de confidencialidade; (iv) notificar o CONTRATANTE sobre incidentes de segurança em até 24 (vinte e quatro) horas da ciência do evento; (v) cooperar com a ANPD quando solicitado.</Item>
        <Item n="11.3">O CONTRATANTE, como Controlador, é exclusivamente responsável pela base legal de tratamento dos dados, pela obtenção de consentimentos necessários e pelo cumprimento dos direitos dos titulares.</Item>
        <Item n="11.4">A REBORN poderá subcontratar parte do tratamento de dados a parceiros tecnológicos, desde que estes ofereçam garantias suficientes de conformidade com a LGPD.</Item>
        <Item n="11.5">Ao término deste Contrato, a REBORN eliminará ou devolverá todos os dados pessoais no prazo de 30 (trinta) dias, exceto aqueles que devam ser retidos por exigência legal ou regulatória, os quais serão mantidos pelo prazo mínimo necessário.</Item>
        <Item n="11.6">O CONTRATANTE indenizará e manterá a REBORN indene de quaisquer penalidades, multas ou condenações impostas pela ANPD ou por decisões judiciais decorrentes de atos do CONTRATANTE como Controlador.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA SEGUNDA – DO NÍVEL DE SERVIÇO (SLA) E SUPORTE">
        <Item n="12.1">A REBORN compromete-se a manter a Plataforma disponível com índice de uptime de no mínimo 99,5% (noventa e nove vírgula cinco por cento), calculado mensalmente, excluindo períodos de manutenção programada.</Item>
        <Item n="12.2">As janelas de manutenção programada serão comunicadas ao CONTRATANTE com antecedência mínima de 72 (setenta e duas) horas, preferencialmente realizadas em horários de menor impacto (madrugada ou fins de semana).</Item>
        <Item n="12.3">Ocorrências de indisponibilidade não programada serão comunicadas ao CONTRATANTE em até 30 (trinta) minutos de sua detecção, com atualização de status a cada hora.</Item>
        <Item n="12.4">Suporte técnico disponível nos seguintes canais: (i) e-mail: suporte@rebornpay.io; (ii) telefone: (11) 97420-5761; (iii) Portal do Cliente; (iv) canal de emergência definido no Anexo I. Horário padrão: segunda a sexta-feira, 9h às 18h (horário de Brasília). Plantão para incidentes críticos: 24x7.</Item>
        <Item n="12.5">Os SLAs de resposta e resolução por criticidade estão detalhados no Anexo I.</Item>
        <Item n="12.6">O não cumprimento do SLA de disponibilidade por 2 (dois) meses consecutivos confere ao CONTRATANTE o direito de rescindir o Contrato sem multa.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA TERCEIRA – DA LIMITAÇÃO DE RESPONSABILIDADE">
        <Item n="13.1">A REBORN não será responsável por quaisquer danos indiretos, incidentais, especiais, punitivos ou consequenciais, incluindo lucros cessantes, perda de receita, perda de dados ou danos à reputação, decorrentes do uso ou impossibilidade de uso dos serviços.</Item>
        <Item n="13.2">A responsabilidade total e agregada da REBORN fica limitada ao valor total das taxas pagas pelo CONTRATANTE nos 6 (seis) meses imediatamente anteriores ao evento gerador do dano.</Item>
        <Item n="13.3">A limitação de responsabilidade prevista nesta cláusula não se aplica nas hipóteses de dolo ou culpa grave da REBORN, ou em caso de violação das obrigações de proteção de dados pessoais.</Item>
        <Item n="13.4">O CONTRATANTE é o único responsável perante seus Consumidores Finais, cabendo a ele responder por eventuais demandas, reclamações, processos administrativos ou judiciais decorrentes de suas atividades comerciais. O CONTRATANTE obriga-se a manter a REBORN indene de quaisquer condenações, custas, honorários e despesas decorrentes de demandas de Consumidores Finais.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA QUARTA – DO DIREITO DE AUDITORIA E MONITORAMENTO">
        <Item n="14.1">A REBORN reserva-se o direito de auditar, a qualquer momento, as operações do CONTRATANTE realizadas através da Plataforma, para verificar conformidade com os termos deste Contrato, normas regulatórias e melhores práticas de segurança.</Item>
        <Item n="14.2">O CONTRATANTE obriga-se a fornecer à REBORN quaisquer informações, documentos e acessos solicitados no prazo máximo de 5 (cinco) dias úteis.</Item>
        <Item n="14.3">A REBORN poderá contratar terceiros especializados para realizar auditorias, garantindo que estes estejam sujeitos às obrigações de confidencialidade deste instrumento.</Item>
        <Item n="14.4">O CONTRATANTE autoriza a REBORN a monitorar, de forma contínua e automatizada, os padrões de transações realizadas através da Plataforma, para fins de prevenção a fraudes, lavagem de dinheiro e compliance.</Item>
        <Item n="14.5">Os resultados das auditorias poderão ser utilizados como base para suspensão ou rescisão contratual, constituição de reserva de segurança ou aplicação de multas.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA QUINTA – DA FORÇA MAIOR E CASO FORTUITO">
        <Item n="15.1">Nenhuma das Partes será responsabilizada por atrasos ou inadimplemento decorrentes de eventos de força maior ou caso fortuito, conforme definidos pela legislação civil brasileira, incluindo, mas não se limitando a: pandemias, desastres naturais, guerras, ataques cibernéticos em larga escala, interrupções de infraestrutura de terceiros (operadoras, bancos, adquirentes), ou decisões governamentais.</Item>
        <Item n="15.2">A Parte afetada deverá notificar a outra no prazo máximo de 48 (quarenta e oito) horas da ocorrência do evento, descrevendo a natureza, extensão e duração prevista.</Item>
        <Item n="15.3">Durante o evento de força maior, as obrigações financeiras do CONTRATANTE permanecem exigíveis na medida em que as transações já processadas gerem recursos.</Item>
        <Item n="15.4">Caso o evento de força maior persista por mais de 30 (trinta) dias consecutivos, qualquer das Partes poderá rescindir este Contrato mediante notificação por escrito, sem ônus ou penalidade.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA SEXTA – DA INTEGRAÇÃO, ONBOARDING E CERTIFICAÇÃO">
        <Item n="16.1">Após a assinatura deste Contrato, o CONTRATANTE passará por processo de onboarding que inclui: (i) análise cadastral e documental; (ii) análise de risco, PLD/FT e compliance; (iii) configuração técnica da Plataforma; (iv) integração via API e homologação; (v) treinamento e capacitação da equipe.</Item>
        <Item n="16.2">O prazo estimado para conclusão do onboarding é de até 10 (dez) dias úteis, podendo ser estendido mediante justificativa ou em caso de pendências documentais do CONTRATANTE.</Item>
        <Item n="16.3">A REBORN reserva-se o direito de recusar o credenciamento do CONTRATANTE a seu exclusivo critério, com base em suas políticas internas de risco e compliance, sem necessidade de justificativa, hipótese em que quaisquer valores antecipados serão devolvidos integralmente.</Item>
        <Item n="16.4">O CONTRATANTE é responsável por manter suas integrações técnicas atualizadas, devendo promover as adequações necessárias sempre que solicitado pela REBORN mediante notificação com antecedência mínima de 30 (trinta) dias.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA SÉTIMA – DA CESSÃO E TRANSFERÊNCIA">
        <Item n="17.1">O CONTRATANTE não poderá ceder, transferir, subcontratar ou de qualquer forma onerar as obrigações e direitos decorrentes deste Contrato a terceiros, sem o prévio consentimento expresso e por escrito da REBORN.</Item>
        <Item n="17.2">A REBORN poderá ceder este Contrato a empresas do mesmo grupo econômico ou em caso de reestruturação societária, mediante simples notificação ao CONTRATANTE com antecedência de 15 (quinze) dias, sem necessidade de consentimento.</Item>
        <Item n="17.3">Em caso de alteração do controle societário do CONTRATANTE, este deverá notificar a REBORN em até 5 (cinco) dias úteis, facultando à REBORN a revisão das condições contratuais ou rescisão sem multa.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA OITAVA – DAS NOTIFICAÇÕES">
        <Item n="18.1">Todas as notificações, comunicações e avisos decorrentes deste Contrato deverão ser realizados por escrito e encaminhados para os endereços e e-mails indicados no Quadro-Resumo.</Item>
        <Item n="18.2">Consideram-se válidas e eficazes as notificações enviadas por: (i) e-mail com confirmação de leitura ou de entrega; (ii) carta registrada com Aviso de Recebimento (AR); (iii) entrega pessoal com protocolo; (iv) notificação extrajudicial por Cartório; (v) por meio da Plataforma REBORN.</Item>
        <Item n="18.3">As notificações por e-mail serão consideradas recebidas em 24 (vinte e quatro) horas do envio, salvo prova de não recebimento. As notificações postais serão consideradas recebidas em 5 (cinco) dias úteis da postagem.</Item>
        <Item n="18.4">É obrigação das Partes manter seus dados de contato atualizados. A desatualização não poderá ser invocada como justificativa para descumprimento de prazos.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA NONA – DA RESCISÃO">
        <p className="font-semibold text-xs mb-1">19.1. Rescisão sem justa causa</p>
        <Item n="19.1.1">Qualquer das Partes poderá rescindir este Contrato sem justa causa mediante notificação por escrito com antecedência mínima de 60 (sessenta) dias, estando sujeita às multas e consequências estabelecidas neste instrumento.</Item>
        <p className="font-semibold text-xs mb-1 mt-2">19.2. Rescisão por justa causa pela REBORN</p>
        <Item n="19.2.1">A REBORN poderá rescindir imediatamente este Contrato, sem ônus e com retenção dos saldos disponíveis para fins de ressarcimento, nas hipóteses de: (i) inadimplência superior a 10 (dez) dias; (ii) descumprimento reiterado de obrigações contratuais; (iii) utilização dos serviços para atividades proibidas; (iv) fraude comprovada ou dolo; (v) taxa de chargeback superior a 2% por 2 (dois) meses consecutivos; (vi) falência, insolvência ou recuperação judicial do CONTRATANTE; (vii) prestação de informações falsas; (viii) violação das normas de PLD/FT; (ix) determinação de autoridade competente.</Item>
        <p className="font-semibold text-xs mb-1 mt-2">19.3. Rescisão por justa causa pelo CONTRATANTE</p>
        <Item n="19.3.1">O CONTRATANTE poderá rescindir este Contrato sem multa nas hipóteses de: (i) descumprimento reiterado pelo REBORN das obrigações de SLA (Cláusula 12.6); (ii) alteração unilateral de condições comerciais pelo REBORN sem observância do prazo de 30 dias; (iii) falência ou insolvência da REBORN.</Item>
        <p className="font-semibold text-xs mb-1 mt-2">19.4. Efeitos da Rescisão</p>
        <Item n="19.4.1">Na hipótese de rescisão, a REBORN interromperá o processamento de novas transações na data de eficácia da rescisão. As transações em curso serão concluídas normalmente.</Item>
        <Item n="19.4.2">O CONTRATANTE deverá quitar todos os débitos pendentes perante a REBORN no prazo de 5 (cinco) dias úteis da data de rescisão.</Item>
        <Item n="19.4.3">Os valores retidos na Reserva de Segurança somente serão liberados após 180 (cento e oitenta) dias corridos da última transação, deduzidos todos os débitos.</Item>
        <Item n="19.4.4">Sobrevivem à rescisão as obrigações de confidencialidade, proteção de dados, responsabilidade por chargebacks, pagamento de valores devidos e as disposições gerais deste instrumento.</Item>
      </Clause>

      <Clause title="CLÁUSULA VIGÉSIMA – DO FORO">
        <Item n="20.1">As PARTES elegem o foro da Comarca de {d.foro} como o único competente para dirimir quaisquer questões ou litígios oriundos deste Contrato.</Item>
        <Item n="20.2">Antes de recorrer ao Poder Judiciário, as PARTES envidará esforços de boa-fé para resolver amigavelmente eventuais controvérsias pelo prazo de 30 (trinta) dias.</Item>
      </Clause>

      {/* ANEXO I */}
      <div className="mt-8 pt-6 border-t-2 border-gray-400">
        <p className="font-bold text-center text-xs uppercase mb-4">ANEXO I – SERVIÇOS DE GATEWAY/ORQUESTRADOR E ANTIFRAUDE</p>
        <p className="mb-2 text-xs">Os serviços incluem: (i) Gateway de Pagamento com suporte a cartão de crédito, débito, PIX e boleto; (ii) Orquestração de pagamentos com múltiplos adquirentes; (iii) Solução Antifraude integrada; (iv) Dashboard de gestão e relatórios; (v) Split de pagamentos; (vi) Suporte técnico conforme Cláusula 10.</p>
        <p className="text-xs font-semibold mb-1">SLA de Disponibilidade: 99,5% mensal (excluindo manutenções programadas)</p>
      </div>

      {/* ANEXO II - Remuneração */}
      <div className="mt-8 pt-6 border-t-2 border-gray-400">
        <p className="font-bold text-center text-xs uppercase mb-4">ANEXO II – REMUNERAÇÃO</p>

        <p className="font-semibold text-xs mb-2">1. TABELA DE MDR (Merchant Discount Rate)</p>
        <table className="w-full border-collapse mb-4 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className={th}>Parcelas</th>
              {BRANDS.map(b => <th key={b} className={th}>{BRAND_LABELS[b]}</th>)}
            </tr>
          </thead>
          <tbody>
            {INSTALLMENTS.map(inst => (
              <tr key={inst}>
                <td className={`${td} text-center font-medium`}>{inst}x</td>
                {BRANDS.map(b => (
                  <td key={b} className={`${td} text-center`}>{mdrVal(mdrMatrix, b, inst)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-semibold text-xs mb-2">2. TABELA DE PREÇOS OPERACIONAIS</p>
        <table className="w-full border-collapse mb-4 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className={th}>Tipo de Serviço</th>
              <th className={th}>Valor</th>
              <th className={th}>Observações</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Setup', cur(d.setup), 'Valor único devido na assinatura'],
              ['Fee por Transação', cur(d.feeTransacao), 'Por cada Transação processada'],
              ['Taxa de Antifraude', cur(d.taxaAntifraude), 'Por transação verificada'],
              ['Taxa PIX In', cur(d.taxaPix), 'Por cada Transação PIX processada'],
              ['Taxa PIX Out', cur(d.taxaPixOut), 'Por cada PIX Out processado'],
              ['Taxa por Split', cur(d.taxaSplit), 'Por cada split criado'],
              ['Taxa por Estorno', cur(d.taxaEstorno), 'Por cada estorno solicitado'],
              ['Taxa de Antecipação', `${parseFloat(d.taxaAntecipacao).toFixed(2).replace('.', ',')}%`, 'Quando solicitada pelo CONTRATANTE'],
              ['Taxa de Pré-Chargeback', cur(d.taxaPreChargeback), 'Por cada Pré-Chargeback'],
              ['Taxa de Chargeback', cur(d.taxaChargeback), 'Por cada Chargeback gerado'],
              ['Prazo de Recebimento', d.prazoRecebimento, 'Dias úteis após a Transação'],
            ].map(([tipo, valor, obs]) => (
              <tr key={tipo}>
                <td className={td}>{tipo}</td>
                <td className={`${td} text-center`}>{valor}</td>
                <td className={td}>{obs}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-semibold text-xs mb-1">3. VALOR MÍNIMO MENSAL</p>
        <p className="text-xs mb-4">O CONTRATANTE concorda em pagar à REBORN um valor mínimo mensal de {cur(d.valorMinimoMensal)}, caso as taxas devidas não atinjam este montante.</p>
      </div>

      {/* Assinaturas */}
      <div className="mt-10 pt-6 border-t-2 border-gray-400">
        <p className="text-xs mb-6">E, por estarem assim justas e contratadas, as PARTES assinam o presente Contrato em 2 (duas) vias de igual teor e forma.</p>
        <p className="text-xs mb-8">São Paulo/SP, {d.dataInicio}</p>

        <div className="grid grid-cols-2 gap-12">
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mt-12">
              <p className="text-xs font-bold">REBORN TECNOLOGIA E SERVIÇOS LTDA</p>
              <p className="text-xs text-gray-600">CNPJ: 59.627.567/0001-35</p>
              <p className="text-xs mt-1">Bruno Mota</p>
              <p className="text-xs text-gray-600">Representante Legal</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mt-12">
              <p className="text-xs font-bold">{d.contratanteNome}</p>
              <p className="text-xs text-gray-600">CNPJ: {d.contratanteCnpj}</p>
              <p className="text-xs mt-1">&nbsp;</p>
              <p className="text-xs text-gray-600">Representante Legal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return <p className="font-bold text-xs uppercase mt-4 mb-2">{title}</p>;
}

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="font-bold text-xs uppercase mb-1">{title}</p>
      {children}
    </div>
  );
}

function Item({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs">
      <strong>{n}.</strong> {children}
    </p>
  );
}
