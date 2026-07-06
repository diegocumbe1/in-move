'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';

/**
 * ActionButton — botón de acción con estado de carga integrado.
 * Pensado para acciones de la valoración ("Guardar ficha", "Generar PDF").
 */
export interface ActionButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    { loading, loadingText, leftIcon, rightIcon, children, disabled, className, ...props },
    ref,
  ) => (
    <Button
      ref={ref}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      className={cn(className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </Button>
  ),
);
ActionButton.displayName = 'ActionButton';
