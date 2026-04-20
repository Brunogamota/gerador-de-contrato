'use client';

function buildPrintHtml(element: HTMLElement): string {
  const styleLinks = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))
    .map(el => `<link rel="stylesheet" href="${(el as HTMLLinkElement).href}">`)
    .join('\n');

  const inlineStyles = Array.from(document.head.querySelectorAll('style'))
    .map(el => `<style>${(el as HTMLStyleElement).textContent}</style>`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrato RebornPay</title>
  ${styleLinks}
  ${inlineStyles}
  <style>
    @page { margin: 20mm 20mm 20mm 25mm; size: A4 portrait; }
    body { background: white !important; margin: 0; padding: 0; }
    .no-print { display: none !important; }
    #contract-document {
      max-width: 100% !important;
      box-shadow: none !important;
      margin: 0 !important;
    }
  </style>
</head>
<body>
  ${element.outerHTML}
</body>
</html>`;
}

export function printContract(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) throw new Error('Popup bloqueado — permita popups para este site');

  win.document.write(buildPrintHtml(element));
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 1200);
}

export async function exportContractToPdf(elementId: string, _contractNumber: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Contract element not found');

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) throw new Error('Popup bloqueado — permita popups para este site');

  win.document.write(buildPrintHtml(element));
  win.document.close();
  win.focus();
  // Don't auto-close so the user can save the PDF from the print dialog
  setTimeout(() => win.print(), 1200);
}
