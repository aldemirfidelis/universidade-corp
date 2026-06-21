import { cn } from '@/lib/utils';
import { Card } from './card';

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'slate';

const TONES: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  slate: 'bg-surface-muted text-slate-600',
};

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'brand',
  className,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 truncate text-xs text-muted">{label}</p>
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
