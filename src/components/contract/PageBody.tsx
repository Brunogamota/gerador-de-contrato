'use client';

import { FullHeader, RunningHeader } from './PageHeader';
import { PageFooter } from './PageFooter';

export interface PageBodyProps {
  pageNum: number;
  totalPages: number;
  contractNumber: string;
  /** Use true only for the first page (shows the full letterhead) */
  isFirst?: boolean;
  children: React.ReactNode;
}

/**
 * A4 page container (210 × 297 mm).
 * Each page renders its own header and footer so PDF capture
 * via html2canvas (one canvas per [data-contract-page]) produces
 * a clean, self-contained A4 sheet.
 */
export function PageBody({ pageNum, totalPages, contractNumber, isFirst = false, children }: PageBodyProps) {
  return (
    <div
      data-contract-page={pageNum}
      style={{
        width: '210mm',
        height: '297mm',
        /* left margin wider — legal convention */
        padding: '12mm 20mm 22mm 25mm',
        background: '#ffffff',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '10pt',
        lineHeight: '1.55',
        color: '#111111',
      }}
    >
      {isFirst
        ? <FullHeader contractNumber={contractNumber} />
        : <RunningHeader contractNumber={contractNumber} />}

      {/* Page content */}
      <div style={{ overflow: 'hidden' }}>
        {children}
      </div>

      <PageFooter pageNum={pageNum} totalPages={totalPages} />
    </div>
  );
}
