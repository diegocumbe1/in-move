import type { Level } from '@/styles/tokens';
import type { IndicatorComparison } from '@/lib/comparison';

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
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-500">{item.title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{item.valueLabel}</p>
        </div>
        {item.status ? (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge[item.status.level]}`}>{item.status.label}</span>
        ) : (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-400">Sin dato</span>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        {item.bands.map((band) => (
          <div
            key={band.label + band.range}
            className={`flex items-center justify-between gap-3 rounded-md px-3 py-1.5 text-sm ${
              band.active ? 'bg-gray-100 font-bold text-gray-900 ring-1 ring-gray-300' : 'text-gray-500'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${dotBg[band.level]}`} />
              {band.label}
            </span>
            <span className="tabular-nums">{band.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FichaComparison({ comparisons }: { comparisons: IndicatorComparison[] }) {
  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="rounded-2xl border-2 border-green-600 bg-white p-5 md:p-7">
        <div className="rounded-lg bg-green-700 px-5 py-3 text-center">
          <h2 className="text-base font-extrabold uppercase tracking-wide text-white md:text-lg">Comparación por rangos</h2>
          <p className="mt-0.5 text-xs text-green-100">Dónde te ubicas en cada indicador</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {comparisons.map((item) => (
            <IndicatorCard key={item.key} item={item} />
          ))}
        </div>
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-500" /> Bajo</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-500" /> Medio</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-green-600" /> Óptimo</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-500" /> Atleta</span>
        </p>
      </div>
    </div>
  );
}
