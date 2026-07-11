'use client';

import { useState } from 'react';
import { FichaDocument, type FichaData } from './ficha-document';
import { FichaComparison } from './ficha-comparison';
import { FichaToolbar } from './ficha-toolbar';
import type { IndicatorComparison, RadarAxis } from '@/lib/comparison';
import type { Rom, FichaSectionKey } from '@/lib/ficha';

export function FichaView({
  data,
  comparisons,
  radar,
  rom,
  sections,
}: {
  data: FichaData;
  comparisons: IndicatorComparison[];
  radar: RadarAxis[];
  rom?: Rom | null;
  sections?: FichaSectionKey[];
}) {
  const showComparison = !sections || sections.includes('comparison');
  const [tab, setTab] = useState<'ficha' | 'comp'>('ficha');
  // Si la comparación queda deshabilitada, forzamos la pestaña de métricas.
  const activeTab = showComparison ? tab : 'ficha';

  const tabBtn = (active: boolean) =>
    `h-10 rounded-md px-4 text-sm font-semibold transition ${
      active ? 'bg-green-700 text-white' : 'border border-green-300 bg-white text-green-800 hover:bg-green-50'
    }`;

  return (
    <div className="grid gap-4">
      <FichaToolbar />

      {showComparison ? (
        <div className="mx-auto flex w-full max-w-[900px] gap-2 print:hidden">
          <button type="button" className={tabBtn(activeTab === 'ficha')} onClick={() => setTab('ficha')}>
            Métricas
          </button>
          <button type="button" className={tabBtn(activeTab === 'comp')} onClick={() => setTab('comp')}>
            Comparación
          </button>
        </div>
      ) : null}

      {/* La ficha y la comparación se muestran por pestaña en pantalla; ambas van al PDF. */}
      <div className={`${activeTab === 'ficha' ? 'block' : 'hidden'} ficha-print print:block`}>
        <FichaDocument data={data} sections={sections} />
      </div>
      {showComparison ? (
        <div className={`${activeTab === 'comp' ? 'block' : 'hidden'} ficha-print print:block print:break-before-page`}>
          <FichaComparison comparisons={comparisons} radar={radar} rom={rom} />
        </div>
      ) : null}
    </div>
  );
}
