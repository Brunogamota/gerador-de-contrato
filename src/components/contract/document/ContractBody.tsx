import { ContractData } from '@/types/contract';
import { Clause, Item } from './ContractElements';

interface Props {
  d: ContractData;
}

export function ContractBody({ d }: Props) {
  return (
    <>
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
    </>
  );
}
