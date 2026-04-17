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
        CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INFRA DE PAGAMENTOS E ANTIFRAUDE
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
          {d.repLegalNome && (
            <tr>
              <td className={th}>Representante Legal</td>
              <td className={td}>
                {d.repLegalNome}
                {d.repLegalCargo ? ` — ${d.repLegalCargo}` : ''}
                {d.repLegalCpf ? ` | CPF: ${d.repLegalCpf}` : ''}
                {d.repLegalRg ? ` | RG: ${d.repLegalRg}` : ''}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Corpo do contrato */}
      <Section title="CONDIÇÕES GERAIS DE PRESTAÇÃO DOS SERVIÇOS" />

      <p className="mb-3">
        Pelo presente instrumento particular, <strong>REBORN TECNOLOGIA E SERVIÇOS LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 59.627.567/0001-35, com sede na Avenida Brg. Faria Lima, 1572, Sala 1022 - Edifício Barão de Rothschild - Jardim Paulistano, São Paulo/SP, CEP 01451-917, neste ato devidamente representada na forma de seus atos constitutivos, doravante denominada simplesmente <strong>"REBORN"</strong>;
      </p>
      <p className="mb-3">
        E <strong>{d.contratanteNome}</strong>, inscrita no CNPJ sob o nº {d.contratanteCnpj}, com sede {d.contratanteEndereco}, neste ato devidamente representada na forma de seus atos constitutivos, doravante denominada simplesmente <strong>"CONTRATANTE"</strong>;
      </p>
      <p className="mb-3">
        REBORN e CONTRATANTE, quando em conjunto, serão doravante denominadas <strong>"PARTES"</strong>, e, individualmente, <strong>"PARTE"</strong>.
      </p>

      <p className="font-bold mb-2">CONSIDERANDO QUE:</p>
      <p className="mb-2">I. A REBORN é uma empresa de tecnologia especializada em soluções para o mercado de pagamentos digitais, oferecendo infraestrutura tecnológica avançada para processamento de pagamentos, gestão de fluxos financeiros e soluções de gateway/orquestrador de pagamento com antifraude;</p>
      <p className="mb-2">II. O CONTRATANTE possui interesse em contratar os serviços e soluções tecnológicas oferecidos pela REBORN para otimizar suas operações comerciais e financeiras;</p>
      <p className="mb-4">III. As PARTES, de comum acordo e em boa-fé, celebram o presente Contrato de Prestação de Serviços de Gateway e Orquestrador de Pagamento, que se regerá pelas cláusulas e condições a seguir estabelecidas.</p>

      <p className="font-bold text-center mb-4">RESOLVEM AS PARTES CELEBRAR O PRESENTE CONTRATO, MEDIANTE AS CLÁUSULAS E CONDIÇÕES SEGUINTES:</p>

      <Clause title="CLÁUSULA PRIMEIRA – DO OBJETO">
        <Item n="1.1">O presente Contrato tem por objeto a prestação de serviços de Gateway e Orquestrador de Pagamento com Solução Antifraude pela REBORN ao CONTRATANTE, conforme as condições gerais e específicas detalhadas nos anexos deste instrumento.</Item>
        <Item n="1.2">Os serviços objeto deste Contrato estão detalhadamente descritos no Anexo I – Serviços de Gateway/Orquestrador e Antifraude.</Item>
        <Item n="1.3">A contratação dos serviços implica na aceitação plena e irrestrita das condições estabelecidas neste instrumento e seus anexos.</Item>
      </Clause>

      <Clause title="CLÁUSULA SEGUNDA – DA VIGÊNCIA">
        <Item n="2.1">O presente Contrato entra em vigor na data de sua assinatura pelas PARTES e vigorará por {d.vigenciaMeses} meses, renovando-se automaticamente por iguais períodos sucessivos, salvo manifestação em contrário de qualquer das PARTES com antecedência mínima de 30 (trinta) dias da data de renovação.</Item>
        <Item n="2.2">A vigência específica dos serviços será contada a partir da data de ativação da Plataforma REBORN para o CONTRATANTE.</Item>
      </Clause>

      <Clause title="CLÁUSULA TERCEIRA – DA REMUNERAÇÃO">
        <Item n="3.1">A remuneração devida pelo CONTRATANTE à REBORN pela prestação dos serviços será deduzida automaticamente dos valores transacionados pelo CONTRATANTE na Plataforma REBORN, conforme as condições, taxas e prazos de repasse estabelecidos no Anexo II – Remuneração.</Item>
        <Item n="3.2">O CONTRATANTE reconhece e concorda que a REBORN poderá compensar quaisquer valores devidos pelo CONTRATANTE (incluindo, mas não se limitando a, taxas, multas, indenizações, valores de Chargeback e estornos) com os valores a serem repassados ao CONTRATANTE decorrentes das Transações processadas.</Item>
        <Item n="3.3">Caso o volume de Transações processadas ou o saldo disponível do CONTRATANTE na Plataforma REBORN seja insuficiente para cobrir os valores devidos à REBORN, o CONTRATANTE deverá realizar o pagamento da diferença em até 5 (cinco) dias úteis após a notificação da REBORN. O não pagamento implicará na incidência de multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês, calculados pro rata die.</Item>
      </Clause>

      <Clause title="CLÁUSULA QUARTA – DOS DIREITOS E OBRIGAÇÕES GERAIS">
        <Item n="4.1">São direitos e obrigações da REBORN:</Item>
        <Item n="4.1.1">Disponibilizar a Plataforma REBORN e os serviços de Gateway/Orquestrador e Antifraude de acordo com as condições estabelecidas neste Contrato e seus anexos.</Item>
        <Item n="4.1.2">Empregar os melhores esforços para garantir a segurança, estabilidade e disponibilidade da Plataforma REBORN, conforme os SLAs definidos no Anexo I.</Item>
        <Item n="4.1.3">Cumprir com a legislação aplicável às suas atividades, incluindo, mas não se limitando, às normas do Banco Central do Brasil, LGPD e regulamentações de PLD/FT.</Item>
        <Item n="4.2">São direitos e obrigações do CONTRATANTE:</Item>
        <Item n="4.2.1">Fornecer à REBORN todas as informações e documentos necessários para seu credenciamento e para a utilização dos serviços, garantindo a veracidade e a atualização de tais dados.</Item>
        <Item n="4.2.2">Utilizar os serviços de forma lícita, em conformidade com este Contrato, seus anexos e a legislação aplicável.</Item>
        <Item n="4.2.3">Ser o único e exclusivo responsável pela relação comercial com seus Consumidores Finais, incluindo entrega de produtos/serviços, suporte, devoluções, cancelamentos e estornos.</Item>
        <Item n="4.2.5">Comunicar imediatamente à REBORN qualquer suspeita de fraude, irregularidade ou uso indevido dos serviços.</Item>
      </Clause>

      <Clause title="CLÁUSULA QUINTA – DA CONFORMIDADE E COMPLIANCE">
        <Item n="5.1">O CONTRATANTE declara e garante que suas atividades comerciais estão em conformidade com a legislação vigente e que não se enquadram nas atividades proibidas listadas no Anexo III.</Item>
        <Item n="5.2">O CONTRATANTE se compromete a manter suas operações em estrita conformidade com as normas de PLD/FT, LGPD e demais regulamentações aplicáveis.</Item>
      </Clause>

      <Clause title="CLÁUSULA SEXTA – DAS ATIVIDADES PROIBIDAS">
        <Item n="6.1">É expressamente vedado ao CONTRATANTE utilizar os serviços da REBORN para processar transações relacionadas às seguintes atividades: (a) venda de produtos ou serviços ilegais, falsificados, roubados ou que violem direitos de propriedade intelectual; (b) jogos de azar não autorizados; (c) criptomoedas e ativos virtuais não regulamentados; (d) conteúdo pornográfico; (e) armas e munições; (f) drogas ilícitas; (g) pirâmides financeiras; (h) lavagem de dinheiro ou financiamento ao terrorismo; (i) serviços financeiros não autorizados pelo Banco Central do Brasil; (j) qualquer atividade que viole as leis brasileiras.</Item>
        <Item n="6.2">A REBORN reserva-se o direito de recusar, bloquear ou cancelar Transações suspeitas, a seu exclusivo critério.</Item>
        <Item n="6.3">A violação desta cláusula constitui justa causa para rescisão imediata do Contrato.</Item>
      </Clause>

      <Clause title="CLÁUSULA SÉTIMA – DAS PENALIDADES E MULTAS">
        <Item n="7.1.1">Pelo descumprimento de qualquer obrigação, a PARTE infratora estará sujeita ao pagamento de multa de 10% (dez por cento) sobre o valor das Transações processadas no mês anterior.</Item>
        <Item n="7.1.2">Em caso de utilização dos serviços para atividades proibidas, o CONTRATANTE estará sujeito a multa de 50% (cinquenta por cento) sobre o valor total das Transações irregulares, além da rescisão imediata.</Item>
        <Item n="7.1.3">O não pagamento dos valores devidos acarretará multa moratória de 2% (dois por cento), acrescido de juros de mora de 1% (um por cento) ao mês, calculados pro rata die, além de correção monetária pelo IGPM/FGV.</Item>
        <Item n="7.1.4">Em caso de fraude comprovada, multa de 100% (cem por cento) sobre o prejuízo causado à REBORN.</Item>
        <Item n="7.2.1">A REBORN poderá suspender imediatamente a prestação dos serviços em caso de: (a) inadimplência superior a 5 dias; (b) suspeita fundada de fraude; (c) taxa de Chargeback superior a 1%; (d) determinação de autoridades competentes; (e) violação de atividades proibidas.</Item>
        <Item n="7.4.1">O CONTRATANTE é integralmente responsável por todos os Chargebacks e estornos decorrentes de suas Transações.</Item>
        <Item n="7.4.2">Para cada Chargeback ou Pré-Chargeback recebido, será cobrada taxa operacional conforme Anexo II, além do valor integral da Transação contestada.</Item>
        <Item n="7.5.2">Em caso de rescisão unilateral sem justa causa antes do prazo mínimo, será devida multa compensatória de 30% (trinta por cento) sobre o valor das taxas médias dos últimos 6 meses, multiplicado pelo número de meses restantes.</Item>
      </Clause>

      <Clause title="CLÁUSULA OITAVA – DA CONFIDENCIALIDADE E PROPRIEDADE INTELECTUAL">
        <Item n="8.1.1">As PARTES comprometem-se a manter sigilo absoluto sobre todas as informações confidenciais, incluindo dados comerciais, estratégias de negócio, informações técnicas e dados de clientes.</Item>
        <Item n="8.1.2">O dever de confidencialidade permanecerá em vigor durante toda a vigência deste Contrato e pelo prazo adicional de 5 (cinco) anos após o seu término.</Item>
        <Item n="8.2.1">Todos os direitos de propriedade intelectual sobre a Plataforma REBORN são de titularidade exclusiva da REBORN.</Item>
        <Item n="8.2.2">Este Contrato concede ao CONTRATANTE apenas uma licença não exclusiva, não transferível e temporária de uso da Plataforma durante a vigência contratual.</Item>
      </Clause>

      <Clause title="CLÁUSULA NONA – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)">
        <Item n="9.1.1">Para os fins deste Contrato, o CONTRATANTE é considerado CONTROLADOR dos dados pessoais dos Consumidores Finais, e a REBORN atua como OPERADOR, processando dados exclusivamente conforme as instruções do CONTRATANTE.</Item>
        <Item n="9.1.3">Como Operador, a REBORN compromete-se a: (i) processar dados pessoais apenas conforme instruções do CONTRATANTE; (ii) implementar medidas técnicas e organizacionais adequadas; (iii) notificar o CONTRATANTE sobre incidentes em até 24 horas.</Item>
        <Item n="9.3.1">Ao término deste Contrato, a REBORN eliminará ou devolverá todos os dados pessoais no prazo de 30 (trinta) dias, exceto os dados que devam ser retidos por exigência legal.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA – DO NÍVEL DE SERVIÇO (SLA) E DISPONIBILIDADE">
        <Item n="10.1.1">A REBORN compromete-se a manter a Plataforma disponível com índice de uptime de no mínimo 99,5%, calculado mensalmente, excluindo períodos de manutenção programada.</Item>
        <Item n="10.1.2">As janelas de manutenção serão comunicadas ao CONTRATANTE com antecedência mínima de 72 (setenta e duas) horas.</Item>
        <Item n="10.3.1">Suporte técnico disponível por e-mail (suporte@rebornpay.io), telefone (011 97420-5761) e Portal do Cliente, de segunda a sexta-feira, das 9h às 18h (horário de Brasília).</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA PRIMEIRA – DA LIMITAÇÃO DE RESPONSABILIDADE">
        <Item n="11.1.1">A REBORN não será responsável por quaisquer danos indiretos, incidentais, especiais, punitivos ou consequenciais, incluindo lucros cessantes, perda de receita ou perda de dados.</Item>
        <Item n="11.1.2">A responsabilidade total e agregada da REBORN fica limitada ao valor total das taxas pagas pelo CONTRATANTE nos 6 (seis) meses imediatamente anteriores ao evento.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA SEGUNDA – DO DIREITO DE AUDITORIA">
        <Item n="12.1">A REBORN reserva-se o direito de auditar, a qualquer momento, as operações do CONTRATANTE realizadas através da Plataforma, para verificar conformidade com os termos deste Contrato.</Item>
        <Item n="12.2">O CONTRATANTE obriga-se a fornecer à REBORN quaisquer informações e documentos solicitados no prazo máximo de 5 (cinco) dias úteis.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA TERCEIRA – DA FORÇA MAIOR E CASO FORTUITO">
        <Item n="13.1">Nenhuma das PARTES será responsabilizada por atrasos ou inadimplemento decorrentes de eventos de força maior ou caso fortuito, conforme definidos pela legislação civil brasileira.</Item>
        <Item n="13.4">Caso o evento de força maior persista por mais de 30 (trinta) dias consecutivos, qualquer das PARTES poderá rescindir este Contrato mediante notificação por escrito, sem ônus ou penalidade.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA QUARTA – DA INTEGRAÇÃO, ONBOARDING E CERTIFICAÇÃO">
        <Item n="14.1.1">Após a assinatura deste Contrato, o CONTRATANTE passará por processo de onboarding que inclui: (i) análise cadastral e documental; (ii) análise de risco e compliance; (iii) configuração técnica; (iv) integração com a Plataforma REBORN; (v) treinamento e capacitação.</Item>
        <Item n="14.1.3">A REBORN reserva-se o direito de recusar o credenciamento do CONTRATANTE a seu exclusivo critério, com base em suas políticas internas de risco e compliance.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA QUINTA – DAS ALTERAÇÕES CONTRATUAIS E REAJUSTES">
        <Item n="15.1.1">A REBORN reserva-se o direito de modificar unilateralmente os termos deste Contrato, mediante notificação ao CONTRATANTE com antecedência mínima de 30 (trinta) dias.</Item>
        <Item n="15.2.1">Os valores e taxas serão reajustados anualmente, na data de aniversário do Contrato, com base na variação positiva do IGPM/FGV acumulado nos 12 meses anteriores.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA SEXTA – DA CESSÃO E TRANSFERÊNCIA">
        <Item n="16.1">O CONTRATANTE não poderá ceder ou transferir este Contrato a terceiros sem o prévio consentimento expresso e por escrito da REBORN.</Item>
        <Item n="16.3">A REBORN poderá ceder este Contrato a empresas do mesmo grupo econômico mediante simples notificação ao CONTRATANTE.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA SÉTIMA – DAS NOTIFICAÇÕES">
        <Item n="17.1">Todas as notificações deverão ser realizadas por escrito e encaminhadas para os endereços e e-mails indicados no Quadro-Resumo.</Item>
        <Item n="17.2">Consideram-se válidas as notificações enviadas por: (i) e-mail com confirmação de leitura; (ii) carta registrada com AR; (iii) entrega pessoal; (iv) por meio da Plataforma REBORN.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA OITAVA – DA RESCISÃO">
        <Item n="18.1.1">Qualquer das PARTES poderá rescindir este Contrato sem justa causa mediante notificação por escrito com antecedência mínima de 60 (sessenta) dias.</Item>
        <Item n="18.2.1">A REBORN poderá rescindir imediatamente nas hipóteses de: (a) inadimplência superior a 10 dias; (b) descumprimento reiterado de obrigações; (c) utilização para atividades proibidas; (d) fraude comprovada; (e) taxa de Chargeback superior a 2% por 2 meses consecutivos; (f) falência ou insolvência do CONTRATANTE.</Item>
        <Item n="18.4.3">Os valores retidos na Reserva de Segurança somente serão liberados após 180 (cento e oitenta) dias corridos da última Transação processada.</Item>
      </Clause>

      <Clause title="CLÁUSULA DÉCIMA NONA – DAS DISPOSIÇÕES FINAIS">
        <Item n="19.1">Este Contrato, juntamente com seus anexos, constitui o acordo integral entre as PARTES, substituindo todos os entendimentos e acordos anteriores, verbais ou escritos.</Item>
        <Item n="19.6">Este Contrato será regido e interpretado de acordo com as leis da República Federativa do Brasil.</Item>
      </Clause>

      <Clause title="CLÁUSULA VIGÉSIMA – DO FORO">
        <Item n="20.1">As PARTES elegem o foro da Comarca de {d.foro} como o único competente para dirimir quaisquer questões ou litígios oriundos deste Contrato.</Item>
        <Item n="20.2">Antes de recorrer ao Poder Judiciário, as PARTES envidará esforços de boa-fé para resolver amigavelmente eventuais controvérsias pelo prazo de 30 (trinta) dias.</Item>
      </Clause>

      {/* ANEXO I */}
      <div className="mt-8 pt-6 border-t-2 border-gray-400 break-before-page">
        <p className="font-bold text-center text-xs uppercase mb-4">ANEXO I – SERVIÇOS DE GATEWAY/ORQUESTRADOR E ANTIFRAUDE</p>
        <p className="mb-2 text-xs">Os serviços incluem: (i) Gateway de Pagamento com suporte a cartão de crédito, débito, PIX e boleto; (ii) Orquestração de pagamentos com múltiplos adquirentes; (iii) Solução Antifraude integrada; (iv) Dashboard de gestão e relatórios; (v) Split de pagamentos; (vi) Suporte técnico conforme Cláusula 10.</p>
        <p className="text-xs font-semibold mb-1">SLA de Disponibilidade: 99,5% mensal (excluindo manutenções programadas)</p>
      </div>

      {/* ANEXO II - Remuneração */}
      <div className="mt-8 pt-6 border-t-2 border-gray-400 break-before-page">
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
      <div className="mt-10 pt-6 border-t-2 border-gray-400 break-before-page">
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
              {d.repLegalNome ? (
                <>
                  <p className="text-xs mt-1">{d.repLegalNome}</p>
                  <p className="text-xs text-gray-600">{d.repLegalCargo || 'Representante Legal'}</p>
                  {d.repLegalCpf && <p className="text-xs text-gray-600">CPF: {d.repLegalCpf}</p>}
                </>
              ) : (
                <>
                  <p className="text-xs mt-1">&nbsp;</p>
                  <p className="text-xs text-gray-600">Representante Legal</p>
                </>
              )}
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
    <div className="mb-3 break-inside-avoid">
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
