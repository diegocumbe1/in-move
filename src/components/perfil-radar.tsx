'use client';

import { useEffect, useId, useState } from 'react';
import type { RadarAxis } from '@/lib/comparison';

/** Radar de perfil de rendimiento (4 ejes, 0–100). Claro/verde para web + PDF. */
export function PerfilRadar({ axes }: { axes: RadarAxis[] }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto block w-full max-w-[360px] rounded-lg outline-none transition hover:bg-green-50/70 focus-visible:ring-2 focus-visible:ring-green-600 print:pointer-events-none"
        aria-label="Ampliar perfil de rendimiento"
      >
        <RadarSvg axes={axes} />
        <span className="mt-1 block text-center text-[11px] font-semibold text-[var(--fc-muted)] print:hidden">Click para ampliar</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-3xl rounded-xl bg-[var(--fc-card)] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 id={titleId} className="text-sm font-extrabold uppercase tracking-wide text-[var(--fc-accent)]">
                Perfil de rendimiento
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[var(--fc-line)] px-3 py-1 text-sm font-semibold text-[var(--fc-ink)] hover:bg-green-50"
              >
                Cerrar
              </button>
            </div>
            <div className="mx-auto max-w-[640px]">
              <RadarSvg axes={axes} large />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RadarSvg({ axes, large = false }: { axes: RadarAxis[]; large?: boolean }) {
  const size = 300;
  const padX = 54; // margen horizontal para que no se corten las etiquetas laterales
  const center = size / 2;
  const radius = 104;
  const angles = [-90, 0, 90, 180].map((a) => (a * Math.PI) / 180);
  const point = (i: number, value: number) => {
    const r = (radius * value) / 100;
    return [center + r * Math.cos(angles[i]), center + r * Math.sin(angles[i])] as const;
  };
  const polygon = axes.map((a, i) => point(i, a.score).join(',')).join(' ');

  return (
    <div className={`mx-auto w-full ${large ? 'max-w-[640px]' : 'max-w-[360px]'}`}>
      <svg viewBox={`${-padX} 0 ${size + padX * 2} ${size}`} role="img" aria-label="Perfil de rendimiento" className="h-auto w-full">
        {[25, 50, 75, 100].map((lvl) => (
          <polygon
            key={lvl}
            points={axes.map((_, i) => point(i, lvl).join(',')).join(' ')}
            fill="none"
            stroke="var(--fc-grid)"
            strokeWidth={lvl === 100 ? 1.5 : 1}
          />
        ))}
        {axes.map((_, i) => {
          const [x, y] = point(i, 100);
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="var(--fc-grid)" strokeWidth="1" />;
        })}
        <polygon points={polygon} fill="rgba(21,128,61,0.18)" stroke="#15803d" strokeWidth="2.5" />
        {axes.map((a, i) => {
          const [x, y] = point(i, a.score);
          return <circle key={a.label} cx={x} cy={y} r="4" fill="#15803d" stroke="#fff" strokeWidth="2" />;
        })}
        {axes.map((a, i) => {
          const [x, y] = point(i, 100);
          const offset = 18;
          // Etiquetas compuestas ("Rendimiento · Salto") se parten en varias líneas
          // para no salirse del viewBox en los ejes laterales.
          const lines = a.label.split(' · ');
          const lineHeight = 13;
          const lx = i === 1 ? x + offset : i === 3 ? x - offset : x;
          const baseY = i === 0 ? y - offset : i === 2 ? y + offset : y;
          const ly = i === 0 ? baseY - (lines.length - 1) * lineHeight : baseY;
          const anchor = i === 1 ? 'start' : i === 3 ? 'end' : 'middle';
          return (
            <g key={a.label}>
              {lines.map((line, li) => (
                <text key={line} x={lx} y={ly + li * lineHeight} textAnchor={anchor} fill="var(--fc-ink)" fontSize="12" fontWeight="700">
                  {line}
                </text>
              ))}
              <text x={lx} y={ly + lines.length * lineHeight + 1} textAnchor={anchor} fill="var(--fc-muted)" fontSize="10">
                {a.score}/100
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
