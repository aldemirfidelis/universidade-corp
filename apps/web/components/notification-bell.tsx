'use client';

import { useRouter } from 'next/navigation';
import * as Popover from '@radix-ui/react-popover';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BookOpen,
  Clock,
  AlertTriangle,
  FileQuestion,
  XCircle,
  Award,
  CalendarClock,
  Check,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

const ICONS: Record<string, { icon: typeof Bell; className: string }> = {
  NEW_COURSE: { icon: BookOpen, className: 'bg-brand/10 text-brand' },
  DUE_SOON: { icon: Clock, className: 'bg-amber-100 text-amber-700' },
  OVERDUE: { icon: AlertTriangle, className: 'bg-red-100 text-red-700' },
  EXAM_AVAILABLE: { icon: FileQuestion, className: 'bg-violet-100 text-violet-700' },
  EXAM_FAILED: { icon: XCircle, className: 'bg-red-100 text-red-700' },
  CERTIFICATE_ISSUED: { icon: Award, className: 'bg-emerald-100 text-emerald-700' },
  CERTIFICATE_EXPIRING: { icon: CalendarClock, className: 'bg-amber-100 text-amber-700' },
  CERTIFICATE_EXPIRED: { icon: AlertTriangle, className: 'bg-red-100 text-red-700' },
  GENERAL: { icon: Bell, className: 'bg-slate-100 text-slate-600' },
};

export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = data ?? [];
  const unread = items.filter((n) => !n.readAt);

  async function markAll() {
    await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}/read`)));
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  function open(n: Notification) {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.linkUrl) router.push(n.linkUrl);
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-surface-muted hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell size={20} />
          {unread.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.62rem] font-bold text-white">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-card-hover data-[state=open]:animate-pop-in"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notificações</p>
            {unread.length > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                <Check size={13} /> Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {items.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted">
                <Bell size={26} className="mx-auto mb-2 text-slate-300" />
                Nenhuma notificação por aqui.
              </div>
            )}
            {items.map((n) => {
              const cfg = ICONS[n.type] ?? ICONS.GENERAL;
              const Icon = cfg.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => open(n)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-line/70 px-4 py-3 text-left transition last:border-0 hover:bg-surface-muted/60',
                    !n.readAt && 'bg-brand/[0.04]',
                  )}
                >
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', cfg.className)}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      {!n.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />}
                    </span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{n.body}</span>}
                    <span className="mt-1 block text-[0.68rem] text-slate-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
