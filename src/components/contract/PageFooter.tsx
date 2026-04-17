'use client';

const SANS: React.CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif' };

interface PageFooterProps {
  pageNum: number;
  totalPages: number;
}

export function PageFooter({ pageNum, totalPages }: PageFooterProps) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '8mm',
      left: '25mm',
      right: '20mm',
      borderTop: '0.5px solid #ccc',
      paddingTop: '2mm',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '6.5pt',
      color: '#aaa',
      ...SANS,
    }}>
      <span>Confidencial · Reborn Tecnologia e Serviços Ltda · CNPJ 59.627.567/0001-35</span>
      <span style={{ color: '#888', fontWeight: 600 }}>
        {pageNum}&nbsp;/&nbsp;{totalPages}
      </span>
    </div>
  );
}
