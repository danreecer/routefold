'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Copy-to-clipboard control.
 *
 * Falls back to a hidden textarea + execCommand where the async clipboard API is
 * unavailable (non-secure origins), so the control is never decorative.
 */
export function CopyButton({
  value,
  label = 'Copy',
  successLabel = 'Copied',
  size = 'sm',
  variant = 'ghost',
  className,
}: {
  value: string | (() => string);
  label?: string;
  successLabel?: string;
  size?: 'sm' | 'md' | 'icon-sm';
  variant?: 'ghost' | 'outline' | 'subtle';
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const copy = React.useCallback(async () => {
    const text = typeof value === 'function' ? value() : value;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(area);
    }
    if (ok) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  const isIcon = size === 'icon-sm';

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => void copy()}
      className={cn('shrink-0', className)}
      aria-label={isIcon ? (copied ? successLabel : label) : undefined}
    >
      {copied ? <Check className="text-positive" /> : <Copy />}
      {!isIcon ? <span>{copied ? successLabel : label}</span> : null}
    </Button>
  );
}
