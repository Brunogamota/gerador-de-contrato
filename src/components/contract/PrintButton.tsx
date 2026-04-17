'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    >
      Imprimir
    </button>
  );
}
