'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { ProgressStatus, PROGRESS_LABELS } from '@uc/shared';
import { api } from '@/lib/api';
import { MyCourse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, Progress } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

const tabs = [
  { key: 'all', label: 'Todos' },
  { key: ProgressStatus.NOT_STARTED, label: 'Pendentes' },
  { key: ProgressStatus.IN_PROGRESS, label: 'Em andamento' },
  { key: ProgressStatus.COMPLETED, label: 'Concluídos' },
] as const;

export default function MeusTreinamentosPage() {
  const [tab, setTab] = useState<string>('all');
  const { data } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => api.get<MyCourse[]>('/learning/my-courses'),
  });

  const courses = (data ?? []).filter((c) => tab === 'all' || c.progressStatus === tab);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Meus Treinamentos</h1>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-sm',
              tab === t.key ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-slate-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {courses.map((c) => (
          <Link key={c.enrollmentId} href={`/treinamento/${c.course.id}`}>
            <Card className="transition hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{c.course.title}</p>
                    {c.mandatory && <Badge tone="amber">Obrigatório</Badge>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={c.progress} className="w-44" />
                    <span className="text-xs text-slate-500">
                      {c.progress}% · {PROGRESS_LABELS[c.progressStatus]}
                    </span>
                  </div>
                </div>
                <ArrowRight className="shrink-0 text-slate-400" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {courses.length === 0 && <p className="text-sm text-slate-500">Nenhum treinamento aqui.</p>}
      </div>
    </div>
  );
}
