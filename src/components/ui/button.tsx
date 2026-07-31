import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium transition-[background-color,border-color,color,opacity] duration-200',
    'disabled:pointer-events-none disabled:opacity-40',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-bright',
  ],
  {
    variants: {
      variant: {
        primary: [
          'rounded-full bg-ink text-paper hover:bg-ink-dim active:bg-ink',
          'shadow-[0_10px_28px_-14px_rgba(28,24,21,0.6)]',
        ].join(' '),
        accent: [
          'rounded-full bg-ember text-white hover:bg-ember-bright active:bg-ember-deep',
          'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28),0_12px_32px_-12px_rgba(226,87,11,0.65)]',
        ].join(' '),
        outline: [
          'rounded-full border border-line-strong bg-white/70 text-ink backdrop-blur-md',
          'hover:border-ember/40 hover:bg-white',
        ].join(' '),
        ghost: 'rounded-full bg-transparent text-ink-dim hover:bg-ink/[0.05] hover:text-ink',
        subtle: [
          'rounded-full border border-line bg-ember-wash text-ember-deep backdrop-blur-md',
          'hover:bg-white',
        ].join(' '),
        danger:
          'rounded-full border border-critical/40 bg-critical/[0.06] text-critical backdrop-blur-md hover:bg-critical/12',
        link: 'text-ember-bright underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-[0.8125rem]',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-[0.9375rem]',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
