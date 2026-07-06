'use client';

import { useState } from 'react';
import { FichaDocument, type FichaData } from './ficha-document';
import { FichaComparison } from './ficha-comparison';
import { FichaToolbar } from './ficha-toolbar';
import type { IndicatorComparison } from '@/lib/comparison';

export function FichaView({ data, comparisons }: { data: FichaData; comparisons: IndicatorComparison[] }) {
  const [tab, setTab] = useState<'ficha' | 'comp'>('ficha');

  const tabBtn = (active: boolean) =>
    `h-10 rounded-md px-4 text-sm font-semibold transition ${
      active ? 'bg-green-700 text-white' : 'border border-green-300 bg-white text-green-800 hover:bg-green-50'
    }`;

  return (
    <div className="grid gap-4">
      <FichaToolbar />

      <div className="mx-auto flex w-full max-w-[900px] gap-2 print:hidden">
        <button type="button" className={tabBtn(tab === 'ficha')} onClick={() => setTab('ficha')}>
          Métricas
        </button>
        <button type="button" className={tabBtn(tab === 'comp')} onClick={() => setTab('comp')}>
          Comparación
        </button>
      </div>

      {/* La ficha y la comparación se muestran por pestaña en pantalla; ambas van al PDF. */}
      <div className={`${tab === 'ficha' ? 'block' : 'hidden'} ficha-print print:block`}>
        <FichaDocument data={data} />
      </div>
      <div className={`${tab === 'comp' ? 'block' : 'hidden'} ficha-print print:block print:break-before-page`}>
        <FichaComparison comparisons={comparisons} />
      </div>
    </div>
  );
}
