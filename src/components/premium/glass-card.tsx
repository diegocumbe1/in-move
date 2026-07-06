import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * GlassCard — la superficie base translúcida de In Move.
 * Todo el producto se construye sobre esta pieza (fichas, métricas, listas).
 */
const glassCardVariants = cva(
  'relative rounded-glass glass-highlight animate-fade-in-up',
  {
    variants: {
      tone: {
        default: 'glass',
        strong: 'glass-strong',
        /** Con tinte de marca para elementos destacados (ej. resultado clave). */
        brand: 'glass border-brand/25 bg-brand/[0.06]',
      },
      pad: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-5 md:p-6',
        lg: 'p-6 md:p-8',
      },
      interactive: {
        true: 'cursor-pointer transition-all duration-base ease-premium hover:-translate-y-0.5 hover:bg-white/[0.07] hover:shadow-glass',
        false: '',
      },
    },
    defaultVariants: { tone: 'default', pad: 'md', interactive: false },
  },
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  asChild?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, tone, pad, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(glassCardVariants({ tone, pad, interactive }), className)}
      {...props}
    />
  ),
);
GlassCard.displayName = 'GlassCard';

/** Encabezado de sección dentro de una card (eyebrow en color de marca). */
export function GlassCardTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-lg text-foreground">{title}</h3>
      </div>
      {action}
    </div>
  );
}
