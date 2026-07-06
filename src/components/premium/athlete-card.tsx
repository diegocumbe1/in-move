import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';

/**
 * AthleteCard — deportista en listados, histórico y rankings.
 * Muestra avatar/inicial, nombre, código de 8 dígitos (mono) y grupos.
 */
export interface AthleteCardProps {
  name: string;
  /** Código único de 8 dígitos. */
  code: string;
  groups?: string[];
  sport?: string;
  photoUrl?: string;
  /** Posición en un ranking (opcional). */
  rank?: number;
  onClick?: () => void;
  className?: string;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function AthleteCard({
  name,
  code,
  groups = [],
  sport,
  photoUrl,
  rank,
  onClick,
  className,
}: AthleteCardProps) {
  return (
    <GlassCard
      pad="sm"
      interactive={!!onClick}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn('flex items-center gap-4', className)}
    >
      {rank != null ? (
        <span className="tabular w-6 shrink-0 text-center font-display text-lg font-bold text-brand">
          {rank}
        </span>
      ) : null}

      <div className="relative size-[3.25rem] shrink-0">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="size-full rounded-xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="grid size-full place-items-center rounded-xl bg-white/[0.06] font-display font-bold text-foreground/90 ring-1 ring-white/10">
            {initials(name)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="tabular rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs tracking-widest text-brand">
            {code}
          </span>
          {sport ? <span className="truncate text-xs text-muted-foreground">{sport}</span> : null}
        </div>
        {groups.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {groups.map((g) => (
              <span
                key={g}
                className="rounded-pill bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {g}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {onClick ? <ChevronRight className="size-5 shrink-0 text-muted-foreground" /> : null}
    </GlassCard>
  );
}
