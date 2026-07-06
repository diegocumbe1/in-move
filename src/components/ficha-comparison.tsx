import type { Level } from '@/styles/tokens';
import type { IndicatorComparison, RadarAxis } from '@/lib/comparison';
import type { Rom } from '@/lib/ficha';
import { PerfilRadar } from './perfil-radar';
import { RomAsymmetry } from './rom-asymmetry';

const dotBg: Record<Level, string> = {
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  good: 'bg-green-600',
  elite: 'bg-sky-500',
};
const badge: Record<Level, string> = {
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  good: 'bg-green-100 text-green-700',
  elite: 'bg-sky-100 text-sky-700',
};

function IndicatorCard({ item }: { item: IndicatorComparison }) {
  const n = item.bands.length;
  return (
    <div className="rounded-xl border border-[var(--fc-line-soft)] bg-[var(--fc-card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--fc-muted)]">{item.title}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--fc-ink)]">{item.valueLabel}</p>
        </div>
        {item.status ? (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge[item.status.level]}`}>{item.status.label}</span>
        ) : (
          <span className="rounded-full bg-[var(--fc-band-active)] px-3 py-1 text-xs font-bold text-[var(--fc-muted)]">Sin dato</span>
        )}
      </div>

      {/* Gauge: zonas de color con marcador ▲ en la zona del deportista */}
      <div className="mt-4">
        <div className="flex gap-0.5">
          {item.bands.map((band) => (
            <div
              key={band.label + band.range}
              className={`h-3 flex-1 rounded-sm ${dotBg[band.level]} ${band.active ? '' : 'opacity-30'} ${band.active ? 'ring-2 ring-[var(--fc-ink)]/40' : ''}`}
            />
          ))}
        </div>
        <div className="mt-0.5 flex">
          {item.bands.map((band) => (
            <div key={band.label + band.range} className="flex-1 text-center text-[11px] leading-none text-[var(--fc-ink)]">
              {band.active ? '▲' : ' '}
            </div>
          ))}
        </div>
        <div className="mt-1 flex" style={{ fontSize: n >= 5 ? '9px' : '10px' }}>
          {item.bands.map((band) => (
            <div key={band.label + band.range} className={`flex-1 px-0.5 text-center leading-tight ${band.active ? 'font-bold text-[var(--fc-ink)]' : 'text-[var(--fc-muted)]'}`}>
              <div>{band.label}</div>
              <div className="tabular-nums">{band.range}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FichaComparison({
  comparisons,
  radar,
  rom,
}: {
  comparisons: IndicatorComparison[];
  radar: RadarAxis[];
  rom?: Rom | null;
}) {
  const hasRadar = radar.some((axis) => axis.score > 0);
  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="rounded-2xl border-2 border-green-600 bg-[var(--fc-card)] p-5 md:p-7">
        <div className="rounded-lg bg-green-700 px-5 py-3 text-center">
          <h2 className="text-base font-extrabold uppercase tracking-wide text-white md:text-lg">Comparación por rangos</h2>
          <p className="mt-0.5 text-xs text-green-100">Dónde te ubicas en cada indicador</p>
        </div>

        {hasRadar ? (
          <div className="mt-5 rounded-xl border border-[var(--fc-line-soft)] bg-[var(--fc-card)] p-4">
            <p className="text-center text-sm font-bold uppercase tracking-wide text-[var(--fc-accent)]">Perfil de rendimiento</p>
            <PerfilRadar axes={radar} />
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--fc-muted)] sm:grid-cols-4">
              {radar.map((axis) => (
                <div key={axis.label} className="text-center">
                  <span className="font-semibold text-[var(--fc-ink)]">{axis.label}:</span> {axis.raw}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <RomAsymmetry rom={rom} />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {comparisons.map((item) => (
            <IndicatorCard key={item.key} item={item} />
          ))}
        </div>
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[var(--fc-muted)]">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-500" /> Bajo</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-500" /> Medio</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-green-600" /> Óptimo</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-500" /> Atleta</span>
        </p>
      </div>
    </div>
  );
}
