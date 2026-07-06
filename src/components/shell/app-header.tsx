import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * AppHeader — cabecera sobria, oscura y premium. Sticky, con safe-area superior
 * y un hairline inferior (nada de barras de color). El isotipo lleva un toque
 * de acento; el resto es neutro para dar aire y jerarquía limpia.
 */
export function AppHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 safe-top',
        'border-b border-hairline bg-background/70 backdrop-blur-strong',
        className,
      )}
    >
      <div className="mx-auto flex h-header max-w-content items-center gap-3 px-5 md:px-8">
        {/* Isotipo sobrio: superficie oscura + marca de acento (no relleno lima) */}
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
          <span className="font-display text-sm font-bold tracking-tighter">IM</span>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-semibold leading-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>
    </header>
  );
}
