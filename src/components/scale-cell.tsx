import type { Level } from '@/styles/tokens';
import type { ScaleCell } from '@/lib/group-columns';

const LEVEL_BG: Record<Level, string> = {
  danger: 'bg-level-danger',
  warning: 'bg-level-warning',
  good: 'bg-level-good',
  elite: 'bg-level-elite',
};

const LEVEL_TEXT: Record<Level, string> = {
  danger: 'text-level-danger',
  warning: 'text-level-warning',
  good: 'text-level-good',
  elite: 'text-level-elite',
};

/**
 * Valor de un indicador con su escala de color: una franja por banda, la banda
 * del deportista resaltada y marcada con ▲. Sirve en el admin y en la ficha grupal.
 */
export function ScaleCellView({ cell }: { cell: ScaleCell | null }) {
  if (!cell) return <span className="text-xs opacity-50">Sin dato</span>;
  return (
    <div className="w-[156px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular truncate text-sm font-bold">{cell.display}</span>
        <span className={`shrink-0 text-[11px] font-semibold ${cell.level ? LEVEL_TEXT[cell.level] : 'opacity-60'}`}>{cell.levelLabel}</span>
      </div>
      <div className="mt-1.5 flex gap-0.5" title={cell.bands.map((band) => band.label).join(' · ')}>
        {cell.bands.map((band, index) => (
          <div key={band.label + index} className="relative flex-1">
            <div className={`h-1.5 rounded-sm ${LEVEL_BG[band.level]} ${index === cell.activeIndex ? '' : 'opacity-25'}`} />
            {index === cell.activeIndex ? (
              <span className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[9px] leading-none">▲</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
