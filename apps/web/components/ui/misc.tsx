import * as React from 'react';
import { cn } from '@/lib/utils';

export function Badge({
  className,
  tone = 'slate',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-3 w-full overflow-hidden rounded-full bg-slate-200', className)}>
      <div
        className="h-full rounded-full bg-brand transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
