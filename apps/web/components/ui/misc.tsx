import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'slate' | 'brand' | 'green' | 'amber' | 'red' | 'blue';

const BADGE_TONES: Record<Tone, { soft: string; outline: string }> = {
  slate: { soft: 'bg-slate-100 text-slate-700', outline: 'border border-slate-200 text-slate-600' },
  brand: { soft: 'bg-brand/10 text-brand', outline: 'border border-brand/30 text-brand' },
  green: { soft: 'bg-emerald-100 text-emerald-700', outline: 'border border-emerald-200 text-emerald-700' },
  amber: { soft: 'bg-amber-100 text-amber-800', outline: 'border border-amber-200 text-amber-700' },
  red: { soft: 'bg-red-100 text-red-700', outline: 'border border-red-200 text-red-700' },
  blue: { soft: 'bg-blue-100 text-blue-700', outline: 'border border-blue-200 text-blue-700' },
};

export function Badge({
  className,
  tone = 'slate',
  outline = false,
  dot = false,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; outline?: boolean; dot?: boolean }) {
  const styles = BADGE_TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        outline ? styles.outline : styles.soft,
        className,
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {props.children}
    </span>
  );
}

export function Progress({
  value,
  className,
  size = 'md',
  tone,
}: {
  value: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'brand' | 'success' | 'warning' | 'danger';
}) {
  const v = Math.max(0, Math.min(100, value || 0));
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  const bar =
    tone === 'success'
      ? 'bg-success'
      : tone === 'warning'
        ? 'bg-warning'
        : tone === 'danger'
          ? 'bg-danger'
          : 'bg-brand';
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-slate-200/80', heights[size], className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', bar)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  className,
  showLabel = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-[0.62rem] font-semibold text-foreground">{Math.round(v)}%</span>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-muted', className)} />;
}
