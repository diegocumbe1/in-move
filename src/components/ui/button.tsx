'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Botón base compatible con shadcn/ui, extendido con la identidad In Move.
 * Tamaños generosos por defecto (tablet-first): el `default` ya cumple el
 * objetivo táctil de 48px.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ' +
    'transition-all duration-base ease-premium select-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] ' +
    '[&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        brand:
          'bg-brand text-brand-foreground shadow-brand hover:bg-brand-strong hover:shadow-glass',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        glass:
          'glass text-foreground hover:bg-white/10',
        outline:
          'border border-border bg-transparent text-foreground hover:bg-white/5 hover:border-brand/50',
        ghost: 'bg-transparent text-foreground hover:bg-white/5',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-5 text-[15px]',
        sm: 'h-10 px-4 text-sm',
        lg: 'h-14 px-8 text-base',
        icon: 'size-12',
        'icon-sm': 'size-10',
      },
    },
    defaultVariants: { variant: 'brand', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
