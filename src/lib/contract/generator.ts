'use client';

/**
 * Opens a dedicated print window with the contract HTML and the page's
 * compiled stylesheets (which include globals.css @media print rules).
 * The user saves as PDF via the browser's native print dialog.
 *
 * CSS split:
 *  - globals.css       → all @media print rules (single source of truth)
 *  - POPUP_SCREEN_CSS  → screen-mode resets for the popup window only
 */

// ─── Popup window screen-mode stylesheet ─────────────────────────────────────
//
// Applied while the popup is open but BEFORE window.print() fires.
// Resets Tailwind screen-only classes (padding, max-width, shadows) so the
// contract renders cleanly in the blank popup window.
//
// Print-specific rules (A4 margins, break helpers, orphans/widows, font size)
// live in globals.css @media print and reach the popup via the mirrored
// <link> tags collected from the host page.

const POPUP_SCREEN_CSS = `
  /* A4 page dimensions — outside @media print so they apply immediately. */
  @page { size: A4; margin: 20mm 25mm 20mm 30mm; }

  /* Force exact color rendering for SVG logo, gradient divider, table bg. */
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Blank-page baseline for the popup window. */
  html, body {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Strip any app chrome present in the mirrored HTML. */
  header, nav, footer, .no-print { display: none !important; }

  /* Reset Tailwind screen utilities on the contract root. */
  #contract-document {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function collectStylesheets(): string {
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  ).map((l) => `<link rel="stylesheet" href="${l.href}">`);

  const inlines = Array.from(document.querySelectorAll('style'))
    .map((s) => `<style>${s.innerHTML}</style>`);

  return [...links, ...inlines].join('\n');
}

function buildPopupHTML(
  contractHTML: string,
  stylesheets: string,
  contractNumber: string,
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Contrato ${contractNumber || 'RebornPay'}</title>
  ${stylesheets}
  <style>${POPUP_SCREEN_CSS}</style>
</head>
<body>
  ${contractHTML}
  <script>
    (function () {
      function triggerPrint() {
        if (document.fonts) {
          document.fonts.ready.then(function () { window.print(); });
        } else {
          setTimeout(function () { window.print(); }, 800);
        }
      }
      if (document.readyState === 'complete') {
        triggerPrint();
      } else {
        window.addEventListener('load', triggerPrint);
      }
    })();
  </script>
</body>
</html>`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function exportContractToPdf(
  elementId: string,
  contractNumber: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Contract element not found: #${elementId}`);

  const win = window.open('', '_blank');
  if (!win) {
    // Popup blocked — fall back to printing the current page directly.
    window.print();
    return;
  }

  win.document.write(
    buildPopupHTML(element.outerHTML, collectStylesheets(), contractNumber),
  );
  win.document.close();
}

/** Convenience alias used by the Imprimir button. */
export function printContract(elementId: string): void {
  exportContractToPdf(elementId, '');
}

/** Renders the contract DOM element as a multi-page A4 PDF and returns base64. */
export async function getContractPdfBase64(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  // Lazy-load heavy libs so they don't bloat the initial bundle
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = pdf.internal.pageSize.getWidth();   // 210mm
  const pageH = pdf.internal.pageSize.getHeight();  // 297mm
  const imgTotalH = (canvas.height * pageW) / canvas.width;

  let yOffset = 0;
  let page = 0;

  while (yOffset < imgTotalH) {
    if (page > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, -(yOffset), pageW, imgTotalH);
    yOffset += pageH;
    page++;
  }

  // Return base64 string only (no "data:..." prefix)
  return pdf.output('datauristring').split(',')[1];
}
