'use client';

export async function exportContractToPdf(elementId: string, contractNumber: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const element = document.getElementById(elementId);
  if (!element) throw new Error('Contract element not found');

  // Temporarily remove overflow/height constraints on parent containers
  // so html2canvas captures the full document height, not just the visible viewport.
  type SavedParent = { el: HTMLElement; overflow: string; maxHeight: string; height: string };
  const savedParents: SavedParent[] = [];
  let cursor: HTMLElement | null = element.parentElement;
  while (cursor && cursor !== document.body) {
    const cs = getComputedStyle(cursor);
    if (cs.overflow !== 'visible' || cs.overflowY !== 'visible' || cs.maxHeight !== 'none') {
      savedParents.push({
        el: cursor,
        overflow: cursor.style.overflow,
        maxHeight: cursor.style.maxHeight,
        height: cursor.style.height,
      });
      cursor.style.overflow = 'visible';
      cursor.style.maxHeight = 'none';
      cursor.style.height = 'auto';
    }
    cursor = cursor.parentElement;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  // Restore parent styles
  for (const s of savedParents) {
    s.el.style.overflow = s.overflow;
    s.el.style.maxHeight = s.maxHeight;
    s.el.style.height = s.height;
  }

  // A4 page dimensions (mm)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();   // 210
  const pageH = pdf.internal.pageSize.getHeight();  // 297
  const mL = 25, mR = 20, mT = 20, mB = 20;
  const printW = pageW - mL - mR;  // 165mm usable width
  const printH = pageH - mT - mB;  // 257mm usable height per page

  const imgW = canvas.width;
  const imgH = canvas.height;

  // Scale: fit canvas width to printable width
  const mmPerPx = printW / imgW;
  // How many canvas pixels fit in one page's printable height
  const pageHeightPx = printH / mmPerPx;

  let yOffset = 0;
  let pageIndex = 0;

  while (yOffset < imgH) {
    if (pageIndex > 0) pdf.addPage();

    const sliceH = Math.min(pageHeightPx, imgH - yOffset);

    // Draw only the pixels for this page into a temporary canvas
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = imgW;
    sliceCanvas.height = Math.ceil(sliceH);
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, imgW, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0, Math.floor(yOffset), imgW, Math.ceil(sliceH),
      0, 0, imgW, Math.ceil(sliceH),
    );

    const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', mL, mT, printW, sliceH * mmPerPx);

    yOffset += pageHeightPx;
    pageIndex++;
  }

  pdf.save(`contrato-${contractNumber}.pdf`);
}

export function printContract(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Copy stylesheet <link> tags using absolute href so they resolve in the popup
  const styleLinks = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))
    .map(el => `<link rel="stylesheet" href="${(el as HTMLLinkElement).href}">`)
    .join('\n');

  // Copy inline <style> blocks (Turbopack/webpack inject CSS this way in dev)
  const inlineStyles = Array.from(document.head.querySelectorAll('style'))
    .map(el => `<style>${(el as HTMLStyleElement).textContent}</style>`)
    .join('\n');

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrato RebornPay</title>
  ${styleLinks}
  ${inlineStyles}
  <style>
    @page { margin: 20mm 20mm 20mm 25mm; size: A4 portrait; }
    body { background: white !important; margin: 0; padding: 0; }
    #contract-document { max-width: 100% !important; box-shadow: none !important; }
  </style>
</head>
<body>
  ${element.outerHTML}
</body>
</html>`);

  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 1200);
}
