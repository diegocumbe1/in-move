import * as React from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';

/**
 * FormSection — bloque de campos de la ficha de valoración (tablet-first).
 * Agrupa campos con un título tipo "eyebrow" y una grilla que colapsa en móvil.
 */
export function FormSection({
  eyebrow,
  title,
  description,
  columns = 2,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Columnas en tablet/desktop; siempre 1 en móvil. */
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}) {
  const cols = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
  }[columns];

  return (
    <GlassCard pad="lg" className={className}>
      <header className="mb-5">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className={cn('grid grid-cols-1 gap-x-6 gap-y-5', cols)}>{children}</div>
    </GlassCard>
  );
}

/** Campo individual con label. El `children` es el input/control real. */
export function Field({
  label,
  hint,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground"
      >
        {label}
        {required ? <span className="text-level-danger">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

/**
 * Input táctil estándar. Altura cómoda para dedos en tablet (h-13 ≈ 52px).
 * Enfoque con anillo de marca; base translúcida coherente con el glass.
 */
export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      // Altura táctil: cómoda en tablet (md), un poco menor en móvil.
      'h-[2.75rem] w-full rounded-md border border-input bg-white/[0.03] px-4 text-[15px] text-foreground md:h-[3.25rem]',
      'placeholder:text-muted-foreground/60 tabular',
      'transition-colors duration-fast ease-premium',
      'focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30',
      'disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
TextInput.displayName = 'TextInput';
