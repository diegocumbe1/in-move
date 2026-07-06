import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import type { Level } from '@/styles/tokens';

type Trend = 'up' | 'down' | 'flat';

export interface MetricCardProps {
  /** Nombre del indicador (ej. "% Grasa corporal"). */
  label: string;
  /** Valor medido. */
  value: number | string;
  unit?: string;
  /** Clasificación del semáforo, si el indicador tiene escala. */
  level?: Level;
  levelLabel?: string;
  /** Variación vs. valoración anterior (ej. "+2.4%"). */
  delta?: string;
  trend?: Trend;
  /** `up` es bueno por defecto; en indicadores donde bajar es mejor (ej. FC,
   *  tiempo de sprint, % grasa) pon `goodDirection="down"`. */
  goodDirection?: 'up' | 'down';
  icon?: React.ReactNode;
  className?: string;
}

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export function MetricCard({
  label,
  value,
  unit,
  level,
  levelLabel,
  delta,
  trend = 'flat',
  goodDirection = 'up',
  icon,
  className,
}: MetricCardProps) {
  const TrendIcon = TREND_ICON[trend];
  const isGood =
    trend === 'flat'
      ? null
      : (trend === 'up') === (goodDirection === 'up');
  const trendColor =
    isGood == null ? 'text-muted-foreground' : isGood ? 'text-level-good' : 'text-level-danger';

  return (
    <GlassCard pad="md" className={cn('accent-top flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="tabular font-display text-3xl font-bold leading-none text-foreground md:text-4xl">
          {value}
        </span>
        {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        {level ? <StatusBadge level={level} label={levelLabel} size="sm" /> : <span />}
        {delta ? (
          <span className={cn('tabular inline-flex items-center gap-1 text-sm font-semibold', trendColor)}>
            <TrendIcon className="size-4" />
            {delta}
          </span>
        ) : null}
      </div>
    </GlassCard>
  );
}
