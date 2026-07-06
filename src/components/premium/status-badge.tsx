import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * StatusBadge — el semáforo del centro (rojo / amarillo / verde / azul).
 * Es la pieza clave del producto: en CADA indicador comunica si el resultado
 * es bajo, aceptable, bueno o de nivel atleta.
 *
 * `level` usa los nombres semánticos; el mapa desde el dominio
 * (rojo/amarillo/verde/azul) vive en `tokens.ts` → LEVEL_BY_DOMAIN.
 */
const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill border font-semibold leading-none whitespace-nowrap',
  {
    variants: {
      level: {
        danger: 'bg-level-danger/12 text-level-danger border-level-danger/25',
        warning: 'bg-level-warning/12 text-level-warning border-level-warning/25',
        good: 'bg-level-good/12 text-level-good border-level-good/25',
        elite: 'bg-level-elite/12 text-level-elite border-level-elite/25',
        empty: 'bg-white/5 text-muted-foreground border-white/10',
      },
      size: {
        sm: 'px-2.5 py-1 text-[11px]',
        md: 'px-3 py-1.5 text-xs',
        lg: 'px-3.5 py-2 text-sm',
      },
    },
    defaultVariants: { level: 'empty', size: 'md' },
  },
);

const DOT: Record<string, string> = {
  danger: 'bg-level-danger',
  warning: 'bg-level-warning',
  good: 'bg-level-good',
  elite: 'bg-level-elite',
  empty: 'bg-muted-foreground',
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Texto de la clasificación (ej. "Atleta", "Aceptable"). */
  label?: string;
  showDot?: boolean;
}

export function StatusBadge({
  level,
  size,
  label,
  showDot = true,
  className,
  ...props
}: StatusBadgeProps) {
  const key = level ?? 'empty';
  return (
    <span className={cn(statusBadgeVariants({ level, size }), className)} {...props}>
      {showDot ? (
        <span className={cn('size-2 rounded-full', DOT[key])} aria-hidden />
      ) : null}
      {label ?? '—'}
    </span>
  );
}
