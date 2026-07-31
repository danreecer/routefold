'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Opens the browser print dialogue against the page's print stylesheet.
 * The print layout flattens frost, drops navigation and paginates on section
 * boundaries, so "save as PDF" produces a usable document rather than a
 * screenshot of a dark interface.
 */
export function PrintButton({
  label = 'Print',
  icon,
  variant = 'outline',
}: {
  label?: string;
  icon?: ReactNode;
  variant?: 'outline' | 'subtle' | 'ghost';
}) {
  return (
    <Button type="button" variant={variant} size="sm" onClick={() => window.print()}>
      {icon}
      {label}
    </Button>
  );
}
