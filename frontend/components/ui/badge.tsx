'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning';
}

const BadgeVariants: Record<string, string> = {
  default: 'bg-amber-300/20 text-amber-300 border border-amber-300/50',
  secondary: 'bg-slate-700/50 text-slate-300 border border-slate-700',
  success: 'bg-emerald-300/20 text-emerald-300 border border-emerald-300/50',
  warning: 'bg-orange-300/20 text-orange-300 border border-orange-300/50',
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider',
        BadgeVariants[variant],
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = 'Badge';

export { Badge };
