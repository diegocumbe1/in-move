'use client';

import { useState } from 'react';
import { ChevronLeft, Download, Link2, Check } from 'lucide-react';

export function FichaToolbar({ canBack = true }: { canBack?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  const btn =
    'inline-flex h-10 items-center gap-2 rounded-md border border-green-300 bg-white px-3 text-sm font-semibold text-green-800 transition hover:bg-green-50';

  return (
    <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 print:hidden">
      {canBack ? (
        <button type="button" onClick={() => window.history.back()} className={btn}>
          <ChevronLeft className="size-4" />
          Volver
        </button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <button type="button" onClick={copyLink} className={btn}>
          {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
          {copied ? 'Enlace copiado' : 'Copiar enlace'}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-green-700 px-3 text-sm font-semibold text-white transition hover:bg-green-800"
        >
          <Download className="size-4" />
          Descargar PDF
        </button>
      </div>
    </div>
  );
}
