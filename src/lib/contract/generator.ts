'use client';

/**
 * Opens a dedicated print window with all app CSS loaded,
 * proper A4 @page rules, and page-break directives applied.
 * The user saves as PDF via the browser's native print dialog.
 *
 * Replaces the html2canvas/jsPDF approach which produced a single
 * giant bitmap page with incorrect pagination and tiny text.
 */
export async function exportContractToPdf(
  elementId: string,
  contractNumber: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Contract element not found');

  const win = window.open('', '_blank');
  if (!win) {
    window.print();
    return;
  }

  // Mirror all stylesheets from the current page so Tailwind classes resolve.
  const linkTags = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  )
    .map((l) => `<link rel="stylesheet" href="${l.href}">`)
    .join('\n');

  const inlineStyleTags = Array.from(document.querySelectorAll('style'))
    .map((s) => `<style>${s.innerHTML}</style>`)
    .join('\n');

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Contrato ${contractNumber ? contractNumber : 'RebornPay'}</title>
  ${linkTags}
  ${inlineStyleTags}
  <style>
    @page {
      size: A4;
      margin: 20mm 25mm 20mm 30mm;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    header, nav, footer, .no-print { display: none !important; }

    #contract-document {
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      font-size: 10pt !important;
    }

    .break-before-page {
      break-before: page !important;
      page-break-before: always !important;
    }

    .break-inside-avoid {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    p, li { orphans: 3; widows: 3; }
    table { break-inside: avoid; }
    thead { display: table-header-group; }
  </style>
</head>
<body>
  ${element.outerHTML}
  <script>
    function triggerPrint() {
      if (document.fonts) {
        document.fonts.ready.then(function() { window.print(); });
      } else {
        setTimeout(function() { window.print(); }, 800);
      }
    }
    if (document.readyState === 'complete') {
      triggerPrint();
    } else {
      window.addEventListener('load', triggerPrint);
    }
  </script>
</body>
</html>`);

  win.document.close();
}

export function printContract(elementId: string): void {
  exportContractToPdf(elementId, '');
}
