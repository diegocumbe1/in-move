'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * FloatingActionButton — acción primaria flotante (ej. "Nueva valoración").
 * Se posiciona por encima del BottomGlassNav respetando la safe-area.
 */
export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
}

export const FloatingActionButton = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ icon, label, className, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        'fixed right-5 z-40 inline-flex h-14 items-center gap-2 rounded-pill px-5',
        'bg-brand text-brand-foreground font-semibold shadow-brand',
        'transition-all duration-base ease-premium hover:bg-brand-strong hover:shadow-glass active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        // Se apoya justo sobre el bottom nav + safe area
        'bottom-[calc(var(--safe-bottom)+var(--bottom-nav-gap,5.5rem))]',
        className,
      )}
      {...props}
    >
      <span className="grid size-6 place-items-center">{icon}</span>
      {label ? <span className="pr-1">{label}</span> : null}
    </button>
  ),
);
FloatingActionButton.displayName = 'FloatingActionButton';
