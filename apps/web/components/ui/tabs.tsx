'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

/**
 * Segmented control (pill tabs) controlado — substitui os padrões soltos de
 * botões-aba espalhados pelas telas. Mantém o estado no componente pai.
 */
export function Tabs<T extends string>({
  value,
  onValueChange,
  items,
  className,
  size = 'md',
}: {
  value: T;
  onValueChange: (value: T) => void;
  items: TabItem<T>[];
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={cn(
        'no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onValueChange(item.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              active ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs font-semibold',
                  active ? 'bg-brand/10 text-brand' : 'bg-slate-200 text-slate-500',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
