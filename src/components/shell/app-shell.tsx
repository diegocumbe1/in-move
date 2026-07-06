import * as React from 'react';
import { cn } from '@/lib/utils';
import { AppHeader } from './app-header';
import { BottomGlassNav, type NavItem } from './bottom-glass-nav';

/**
 * AppShell — layout raíz de la app autenticada (admin).
 * Compone Header sticky + contenido con scroll + BottomGlassNav fijo.
 * Reserva espacio inferior para que el nav nunca tape el contenido y
 * mantiene un ancho de lectura cómodo en tablet y desktop.
 */
export function AppShell({
  title,
  subtitle,
  headerRight,
  nav,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  nav?: NavItem[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader title={title} subtitle={subtitle} right={headerRight} />

      <main
        className={cn(
          'mx-auto w-full max-w-content flex-1 px-5 pt-5 md:px-8 md:pt-8',
          // Espacio para bottom nav + safe area (que el contenido no quede debajo)
          'pb-[calc(var(--safe-bottom)+6.5rem)]',
          className,
        )}
      >
        {children}
      </main>

      <BottomGlassNav items={nav} />
    </div>
  );
}
