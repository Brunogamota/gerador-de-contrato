import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

// ─── colors ───────────────────────────────────────────────────
const RED   = 'E8213A';
const DARK  = '1A1A2E';
const BLUE  = '1D4ED8';
const GREEN = '065F46';
const WHITE = 'FFFFFF';
const FGRAY = 'F5F5F5'; // form field bg
const LGRAY = 'F0F0F0'; // table header bg
const MGRAY = 'CCCCCC'; // border
const DGRAY = '777777'; // hint text
const LABEL = '444444'; // label text
const DARK_TEXT = '1A1A1A';

// ─── page layout ─────────────────────────────────────────────
// A4 portrait, 1.8cm margins → content width ≈ 9800 twips
const PW = 9800;

// ─── border helpers ──────────────────────────────────────────
const NB = { style: BorderStyle.NONE, size: 0, color: WHITE } as const;
const noBorders = { top: NB, bottom: NB, left: NB, right: NB, insideH: NB, insideV: NB };
const cellNoBorders = { top: NB, bottom: NB, left: NB, right: NB };
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: MGRAY } as const;
const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

// ─── primitives ──────────────────────────────────────────────

function sp(before = 0, after = 0) {
  return new Paragraph({ spacing: { before, after } });
}

function sectionHeader(text: string, bgColor: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `  ${text}`, bold: true, color: WHITE, size: 18, allCaps: true })],
    shading: { type: ShadingType.SOLID, color: bgColor, fill: bgColor },
    spacing: { before: 260, after: 160 },
  });
}

function label(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: LABEL, size: 14 })],
    spacing: { before: 100, after: 30 },
  });
}

function inputLine(hintText?: string): Paragraph {
  return new Paragraph({
    children: hintText
      ? [new TextRun({ text: hintText, color: DGRAY, size: 13 })]
      : [new TextRun({ text: '' })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: MGRAY } },
    spacing: { before: 0, after: 100 },
    shading: { type: ShadingType.SOLID, color: FGRAY, fill: FGRAY },
  });
}

function field(labelText: string, hint?: string): Paragraph[] {
  return [label(labelText), inputLine(hint)];
}

// ─── invisible-border table for form grid layouts ─────────────

function formCell(
  labelText: string,
  hint?: string,
  opts: { span?: number; tall?: boolean } = {},
): TableCell {
  const { span = 1, tall = false } = opts;
  const lines = tall ? [inputLine(hint), inputLine()] : [inputLine(hint)];
  return new TableCell({
    children: [label(labelText), ...lines],
    columnSpan: span,
    borders: cellNoBorders,
    margins: { left: 80, right: 80, top: 0, bottom: 0 },
    verticalAlign: VerticalAlign.TOP,
  });
}

function emptyFormCell(): TableCell {
  return new TableCell({ children: [sp()], borders: cellNoBorders });
}

function formTable(rows: TableRow[], colWidths: number[]): Table {
  return new Table({
    rows,
    width: { size: PW, type: WidthType.DXA },
    columnWidths: colWidths,
    borders: noBorders,
  });
}

function checkItem(text: string): TextRun[] {
  return [
    new TextRun({ text: '☐  ', size: 20 }),
    new TextRun({ text: text, size: 18, color: DARK_TEXT }),
    new TextRun({ text: '          ', size: 18 }),
  ];
}

function checkRow(items: string[]): Paragraph {
  return new Paragraph({
    children: items.flatMap(checkItem),
    spacing: { before: 80, after: 60 },
  });
}

function checkLabel(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: LABEL, size: 14 })],
    spacing: { before: 120, after: 60 },
  });
}

// ─── MDR table ────────────────────────────────────────────────

function mdrTable(brands: string[], rows: string[]): Table {
  const labelW = 2000;
  const brandW = Math.floor((PW - labelW) / brands.length);
  const colWidths = [labelW, ...brands.map(() => brandW)];

  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: 'Parcelas / Tipo', bold: true, color: WHITE, size: 16 })],
        })],
        shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
        borders: allBorders,
        margins: { left: 80, right: 80, top: 60, bottom: 60 },
      }),
      ...brands.map((b) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: b, bold: true, color: WHITE, size: 16 })],
            alignment: AlignmentType.CENTER,
          })],
          shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
          borders: allBorders,
          margins: { left: 60, right: 60, top: 60, bottom: 60 },
        }),
      ),
    ],
    tableHeader: true,
  });

  const dataRows = rows.map((rowLabel, ri) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: rowLabel, bold: true, color: DARK_TEXT, size: 18 })],
          })],
          shading: { type: ShadingType.SOLID, color: LGRAY, fill: LGRAY },
          borders: allBorders,
          margins: { left: 80, right: 80, top: 60, bottom: 60 },
        }),
        ...brands.map(() =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: '_________ %', color: DGRAY, size: 18 })],
              alignment: AlignmentType.CENTER,
            })],
            shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? WHITE : FGRAY, fill: ri % 2 === 0 ? WHITE : FGRAY },
            borders: allBorders,
            margins: { left: 60, right: 60, top: 60, bottom: 60 },
            verticalAlign: VerticalAlign.CENTER,
          }),
        ),
      ],
    }),
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: PW, type: WidthType.DXA },
    columnWidths: colWidths,
  });
}

// ─── Fees table ───────────────────────────────────────────────

function feesTable(rows: Array<[string, string]>): Table {
  const w = [3200, 2000, Math.floor((PW - 5200) / 2), Math.floor((PW - 5200) / 2)];

  const hdr = (t: string) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: WHITE, size: 16 })] })],
    shading: { type: ShadingType.SOLID, color: DARK, fill: DARK },
    borders: allBorders,
    margins: { left: 80, right: 80, top: 60, bottom: 60 },
  });

  const headerRow = new TableRow({
    children: [hdr('Fee'), hdr('Unidade'), hdr('🇺🇸  EUA (valor atual)'), hdr('🇪🇺  Europa (valor atual)')],
    tableHeader: true,
  });

  const dataRows = rows.map(([fee, unit], ri) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: fee, bold: true, color: DARK_TEXT, size: 18 })] })],
          shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? LGRAY : FGRAY, fill: ri % 2 === 0 ? LGRAY : FGRAY },
          borders: allBorders,
          margins: { left: 80, right: 80, top: 60, bottom: 60 },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: unit, color: DGRAY, size: 16 })] })],
          shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? LGRAY : FGRAY, fill: ri % 2 === 0 ? LGRAY : FGRAY },
          borders: allBorders,
          margins: { left: 80, right: 80, top: 60, bottom: 60 },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '' })], border: { bottom: thinBorder } })],
          shading: { type: ShadingType.SOLID, color: WHITE, fill: WHITE },
          borders: allBorders,
          margins: { left: 80, right: 80, top: 60, bottom: 60 },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '' })], border: { bottom: thinBorder } })],
          shading: { type: ShadingType.SOLID, color: WHITE, fill: WHITE },
          borders: allBorders,
          margins: { left: 80, right: 80, top: 60, bottom: 60 },
        }),
      ],
    }),
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: PW, type: WidthType.DXA },
    columnWidths: w,
  });
}

// ─── Settlement block ─────────────────────────────────────────

function settlementBlock(flag: string, currency: string, fields: string[][]): TableCell {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: `${flag}  Conta para liquidação em ${currency}`, bold: true, color: BLUE, size: 18 })],
      spacing: { before: 60, after: 120 },
    }),
    ...fields.flatMap(([l, h]) => field(l, h)),
  ];
  return new TableCell({
    children,
    borders: { top: NB, bottom: NB, left: NB, right: { style: BorderStyle.SINGLE, size: 4, color: MGRAY } },
    margins: { left: 80, right: 180, top: 80, bottom: 80 },
    shading: { type: ShadingType.SOLID, color: 'F8F8F8', fill: 'F8F8F8' },
  });
}

// ─── Main export ─────────────────────────────────────────────

export async function generateIntakeDocx(): Promise<Blob> {
  const H = 3 / 2; // half 100 = 50
  const half = Math.floor(PW / 2);
  const third = Math.floor(PW / 3);
  const quarter = Math.floor(PW / 4);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20, color: DARK_TEXT },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1020, bottom: 1020, left: 1020, right: 1020 },
        },
      },
      children: [

        // ══ HEADER ══════════════════════════════════════════════
        new Table({
          rows: [new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'REBORN', bold: true, size: 52, color: RED }), new TextRun({ text: 'PAY', bold: true, size: 52, color: RED })],
                    spacing: { after: 40 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'COLETA DE INFORMAÇÕES · PROCESSAMENTO INTERNACIONAL', bold: true, size: 20, color: DARK })],
                    spacing: { after: 20 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'Preencha e devolva à RebornPay para geração de proposta comercial  ·  EUA & Europa', size: 16, color: DGRAY })],
                  }),
                ],
                borders: { top: NB, bottom: { style: BorderStyle.SINGLE, size: 8, color: RED }, left: NB, right: NB },
                margins: { bottom: 120 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'REBORN TECNOLOGIA E SERVIÇOS LTDA', bold: true, size: 16, color: DARK })], alignment: AlignmentType.RIGHT }),
                  new Paragraph({ children: [new TextRun({ text: 'CNPJ 59.627.567/0001-35', size: 14, color: DGRAY })], alignment: AlignmentType.RIGHT }),
                  new Paragraph({ children: [new TextRun({ text: 'juridico@rebornpay.io  ·  (11) 97420-5761', size: 14, color: DGRAY })], alignment: AlignmentType.RIGHT }),
                  new Paragraph({ children: [new TextRun({ text: 'Data: ______ / ______ / ________', bold: true, size: 16, color: RED })], alignment: AlignmentType.RIGHT, spacing: { before: 80 } }),
                ],
                borders: { top: NB, bottom: { style: BorderStyle.SINGLE, size: 8, color: RED }, left: NB, right: NB },
                margins: { bottom: 120 },
                verticalAlign: VerticalAlign.BOTTOM,
              }),
            ],
          })],
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [Math.floor(PW * 0.6), Math.floor(PW * 0.4)],
          borders: noBorders,
        }),

        sp(160, 80),

        // ── info box ────────────────────────────────────────────
        new Paragraph({
          children: [
            new TextRun({ text: 'Como preencher: ', bold: true, color: 'B45309', size: 18 }),
            new TextRun({ text: 'Preencha todos os campos abaixo com suas taxas e informações operacionais atuais. Quanto mais detalhado, mais precisa será sua proposta. Devolva este documento por e-mail para ', color: '78350F', size: 18 }),
            new TextRun({ text: 'juridico@rebornpay.io', bold: true, color: RED, size: 18 }),
            new TextRun({ text: '.', color: '78350F', size: 18 }),
          ],
          shading: { type: ShadingType.SOLID, color: 'FFF8E1', fill: 'FFF8E1' },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: 'F59E0B' } },
          spacing: { before: 0, after: 240 },
          indent: { left: 160 },
        }),

        // ══ 1 · DADOS DA EMPRESA ════════════════════════════════
        sectionHeader('1 · Dados da Empresa', RED),

        formTable([
          new TableRow({ children: [formCell('Razão Social / Company Legal Name', undefined, { span: 2 })] }),
          new TableRow({ children: [formCell('CNPJ (Brasil)'), formCell('EIN / VAT / Tax ID (País de Origem)')] }),
          new TableRow({ children: [formCell('País de Constituição'), formCell('Website / App')] }),
          new TableRow({ children: [formCell('Nome do Responsável Comercial'), formCell('E-mail')] }),
          new TableRow({ children: [formCell('Telefone / WhatsApp'), formCell('MCC — Código de Categoria do Negócio', 'Ex: 5411 Supermercado · 5812 Restaurante · 7372 Software')] }),
        ], [half, half]),

        checkLabel('Mercados onde atua (marque todos):'),
        checkRow(['🇺🇸 Estados Unidos', '🇬🇧 Reino Unido', '🇪🇺 União Europeia', '🇧🇷 Brasil (cross-border)']),

        // ══ 2 · VOLUME ══════════════════════════════════════════
        sectionHeader('2 · Volume de Processamento', BLUE),

        formTable([
          new TableRow({ children: [formCell('Volume Mensal Total (USD)', 'Valor processado/mês em dólares'), formCell('Volume Mensal Total (EUR)', 'Valor processado/mês em euros'), formCell('Volume Mensal Total (BRL)', 'Se houver operação no Brasil')] }),
          new TableRow({ children: [formCell('Volume Anual Negociado (USD)'), formCell('Ticket Médio (USD)', 'Valor médio por transação'), formCell('Nº de Transações / Mês')] }),
          new TableRow({ children: [formCell('Maior Ticket Individual (USD)'), formCell('Sazonalidade (mês de pico)'), formCell('% Crescimento Esperado / Ano')] }),
        ], [third, third, third]),

        checkLabel('Mix de transações (% aproximado — somar 100%):'),

        formTable([
          new TableRow({ children: [
            formCell('Card-not-present — CNP (%)', 'E-commerce, API, mobile'),
            formCell('Card-present — CP (%)', 'POS físico'),
            formCell('Crédito (%)'),
            formCell('Débito (%)'),
          ]}),
          new TableRow({ children: [
            formCell('Cartões domésticos USD/EUR (%)'),
            formCell('Cartões internacionais cross (%)'),
            formCell('Com autenticação 3DS (%)'),
            formCell('Recorrente / Assinatura (%)'),
          ]}),
        ], [quarter, quarter, quarter, quarter]),

        // ══ 3 · MDR EUA ═════════════════════════════════════════
        sectionHeader('3 · Taxas MDR Atuais · 🇺🇸 Estados Unidos', BLUE),

        new Paragraph({
          children: [new TextRun({ text: 'Informe as taxas (MDR) que seu processador atual cobra. Deixe em branco se a bandeira não for aceita.', size: 16, color: DGRAY })],
          spacing: { before: 0, after: 120 },
        }),

        mdrTable(
          ['Visa Crédito', 'MC Crédito', 'Amex', 'Discover', 'Visa Débito', 'MC Débito'],
          ['À vista (1x)', 'Internacional — IN', 'Internacional — OUT'],
        ),

        formTable([
          new TableRow({ children: [formCell('Processador atual (EUA)', 'Ex: Stripe, Adyen, Braintree, Square, PayPal'), formCell('Taxa flat por transação (USD)', 'Ex: $0.30 por transação')] }),
        ], [half, half]),

        // ══ 4 · MDR EUROPA ══════════════════════════════════════
        sectionHeader('4 · Taxas MDR Atuais · 🇪🇺 Europa / Reino Unido', BLUE),

        new Paragraph({
          children: [new TextRun({ text: 'Para empresas que operam na União Europeia ou Reino Unido. Informe em % sobre o valor da transação.', size: 16, color: DGRAY })],
          spacing: { before: 0, after: 120 },
        }),

        mdrTable(
          ['Visa Crédito', 'MC Crédito', 'Visa Débito', 'MC Débito', 'Amex', 'UnionPay'],
          ['Doméstico UE', 'Intra-UE (cross)', 'Não-UE (intl)'],
        ),

        formTable([
          new TableRow({ children: [formCell('Processador atual (Europa)'), formCell('Taxa flat por transação (EUR)')] }),
        ], [half, half]),

        // ══ 5 · OUTROS FEES ═════════════════════════════════════
        sectionHeader('5 · Outros Fees e Encargos Atuais', DARK),

        feesTable([
          ['Fee de Transação',           'USD ou % / transação'],
          ['Antifraude / Risk Score',    '% ou USD / transação'],
          ['3D Secure (3DS2)',           'USD / autenticação'],
          ['Chargeback (por ocorrência)','USD / disputa'],
          ['Pre-Chargeback / RDR',       'USD / alerta'],
          ['Estorno (Refund)',           'USD / estorno'],
          ['Gateway / API',              'USD/mês ou por transação'],
          ['Setup / Implantação',        'USD (pagamento único)'],
          ['Mensalidade Mínima',         'USD / mês'],
          ['PCI Compliance',             'USD / ano'],
          ['Liquidação / Payout',        '% ou USD / lote'],
          ['Conversão de Moeda (FX)',    '% sobre o valor'],
        ]),

        // ══ 6 · RISCO & PRAZO ═══════════════════════════════════
        sectionHeader('6 · Risco & Prazo de Recebimento', DARK),

        formTable([
          new TableRow({ children: [
            formCell('Taxa de Chargeback Atual (%)', '% sobre total de transações/mês'),
            formCell('Taxa de Fraude Atual (%)'),
            formCell('Taxa de Aprovação (%)'),
          ]}),
          new TableRow({ children: [
            formCell('Prazo de Recebimento Atual (EUA)', 'Ex: D+1, D+2, semanal'),
            formCell('Prazo de Recebimento Atual (Europa)'),
            formCell('Rolling Reserve atual (%)', '% retido como garantia pelo processador'),
          ]}),
        ], [third, third, third]),

        checkLabel('Nível de risco (marque):'),
        checkRow(['Low Risk', 'Mid Risk', 'High Risk', 'CBD / Pharma', 'Gaming / iGaming']),
        checkRow(['Forex / Crypto', 'Travel / OTA', 'SaaS / Subscription', 'Marketplace']),

        // ══ 7 · LIQUIDAÇÃO ══════════════════════════════════════
        sectionHeader('7 · Dados de Liquidação', GREEN),

        new Table({
          rows: [new TableRow({
            children: [
              settlementBlock('🇺🇸', 'USD', [
                ['Banco', ''],
                ['ABA / Routing Number', ''],
                ['Account Number', ''],
                ['Beneficiário (nome na conta)', ''],
              ]),
              settlementBlock('🇪🇺', 'EUR', [
                ['Banco', ''],
                ['IBAN', ''],
                ['BIC / SWIFT', ''],
                ['Beneficiário (nome na conta)', ''],
              ]),
            ],
          })],
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [half, half],
          borders: noBorders,
        }),

        sp(80),

        formTable([
          new TableRow({ children: [
            new TableCell({
              children: [
                checkLabel('Moeda preferencial de liquidação:'),
                checkRow(['USD', 'EUR', 'GBP', 'BRL']),
              ],
              borders: cellNoBorders,
              margins: { left: 80, right: 80 },
            }),
            new TableCell({
              children: [
                checkLabel('Frequência de liquidação desejada:'),
                checkRow(['Diária (D+1)', 'Semanal', 'Quinzenal']),
              ],
              borders: cellNoBorders,
              margins: { left: 80, right: 80 },
            }),
            new TableCell({
              children: [
                checkLabel('Interesse em antecipação de recebíveis?'),
                checkRow(['Sim', 'Não']),
              ],
              borders: cellNoBorders,
              margins: { left: 80, right: 80 },
            }),
          ] }),
        ], [third, third, third]),

        // ══ 8 · INTEGRAÇÃO ══════════════════════════════════════
        sectionHeader('8 · Integração Técnica', DARK),

        formTable([
          new TableRow({ children: [
            formCell('Plataforma de e-commerce', 'Ex: Shopify, WooCommerce, custom'),
            formCell('Linguagem / Stack backend', ''),
            formCell('Prazo desejado para go-live', ''),
          ]}),
        ], [third, third, third]),

        checkLabel('Tipo de integração necessária:'),
        checkRow(['API REST', 'SDK', 'Hosted Payment Page', 'Plugin (WooCommerce / Shopify)']),

        checkLabel('Funcionalidades necessárias (marque todas):'),
        checkRow(['Tokenização de cartões', 'Cobrança recorrente / assinatura', 'Split de pagamentos', 'Marketplace / sub-merchants']),
        checkRow(['PIX (operação Brasil)', 'Boleto bancário', 'Apple Pay / Google Pay', 'Buy Now Pay Later']),

        formTable([
          new TableRow({ children: [formCell('Observações / necessidades especiais', '', { tall: true, span: 2 })] }),
        ], [half, half]),

        // ══ ASSINATURA ══════════════════════════════════════════
        sp(200),

        new Table({
          rows: [new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'RESPONSÁVEL PELO PREENCHIMENTO', bold: true, color: LABEL, size: 14, allCaps: true })], spacing: { before: 0, after: 400 } }),
                  new Paragraph({ children: [new TextRun({ text: '' })], border: { top: { style: BorderStyle.SINGLE, size: 6, color: DARK } } }),
                  new Paragraph({ children: [new TextRun({ text: 'Nome / Cargo / Data', color: DGRAY, size: 14 })], spacing: { before: 60 } }),
                ],
                borders: cellNoBorders,
                margins: { right: 400 },
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'USO INTERNO · EXECUTIVO DE CONTAS REBORNPAY', bold: true, color: LABEL, size: 14, allCaps: true })], spacing: { before: 0, after: 400 } }),
                  new Paragraph({ children: [new TextRun({ text: '' })], border: { top: { style: BorderStyle.SINGLE, size: 6, color: DARK } } }),
                  new Paragraph({ children: [new TextRun({ text: 'Nome / Data de Recebimento', color: DGRAY, size: 14 })], spacing: { before: 60 } }),
                ],
                borders: cellNoBorders,
                margins: { left: 400 },
              }),
            ],
          })],
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [half, half],
          borders: noBorders,
        }),

        // ══ FOOTER ══════════════════════════════════════════════
        sp(200),
        new Paragraph({
          children: [
            new TextRun({ text: 'RebornPay · Av. Brg. Faria Lima, 1572 · Sala 1022 · São Paulo/SP · CEP 01451-917  |  Documento confidencial · v2026.05', size: 14, color: DGRAY }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: MGRAY } },
          spacing: { before: 120 },
        }),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
