export function Section({ title }: { title: string }) {
  return <p className="font-bold text-xs uppercase mt-4 mb-2">{title}</p>;
}

export function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 break-inside-avoid">
      <p className="font-bold text-xs uppercase mb-1">{title}</p>
      {children}
    </div>
  );
}

export function Item({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs">
      <strong>{n}.</strong> {children}
    </p>
  );
}
