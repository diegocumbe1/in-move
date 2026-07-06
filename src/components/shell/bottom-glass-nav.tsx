'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ClipboardList, Trophy, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BottomGlassNav — isla flotante de navegación (glass OSCURO), tablet-first.
 * NO es una barra que cruza toda la pantalla: flota centrada, con aire alrededor,
 * y respeta la safe-area del home indicator (iPhone/iPad). Botones grandes (>=48px).
 */
export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const DEFAULT_NAV: NavItem[] = [
  { href: '/', label: 'Panel', icon: LayoutDashboard },
  { href: '/deportistas', label: 'Deportistas', icon: Users },
  { href: '/valoracion', label: 'Valoración', icon: ClipboardList },
  { href: '/rankings', label: 'Rankings', icon: Trophy },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
];

export function BottomGlassNav({ items = DEFAULT_NAV }: { items?: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center safe-bottom">
      <nav
        aria-label="Navegación principal"
        className="glass-strong glass-highlight pointer-events-auto mb-3 flex items-center gap-1 rounded-[1.75rem] p-1.5"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex min-w-touch flex-col items-center justify-center gap-1 rounded-[1.35rem] px-3.5 py-2.5',
                'transition-colors duration-base ease-premium',
                active
                  ? 'bg-brand/12 text-brand'
                  : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
              )}
            >
              <Icon className="size-6" />
              <span className="text-[11px] font-semibold leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
