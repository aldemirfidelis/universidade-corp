'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen } from 'lucide-react';
import { ProgressStatus } from '@uc/shared';
import { api } from '@/lib/api';
import { MyCourse } from '@/lib/types';
import { CourseCard } from '@/components/course-card';
import { Tabs } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCards } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';

type TabKey = 'all' | ProgressStatus;

export default function MeusTreinamentosPage() {
  const [tab, setTab] = useState<TabKey>('all');
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => api.get<MyCourse[]>('/learning/my-courses'),
  });

  const all = data ?? [];
  const counts = useMemo(
    () => ({
      all: all.length,
      [ProgressStatus.NOT_STARTED]: all.filter((c) => c.progressStatus === ProgressStatus.NOT_STARTED).length,
      [ProgressStatus.IN_PROGRESS]: all.filter((c) => c.progressStatus === ProgressStatus.IN_PROGRESS).length,
      [ProgressStatus.COMPLETED]: all.filter((c) => c.progressStatus === ProgressStatus.COMPLETED).length,
    }),
    [all],
  );

  const courses = all.filter((c) => {
    const matchTab = tab === 'all' || c.progressStatus === tab;
    const term = q.trim().toLowerCase();
    const matchSearch =
      !term ||
      c.course.title.toLowerCase().includes(term) ||
      (c.course.code ?? '').toLowerCase().includes(term);
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Meus Treinamentos" subtitle="Continue, refaça ou revise seus cursos." icon={<BookOpen size={20} />} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'all', label: 'Todos', count: counts.all },
            { value: ProgressStatus.NOT_STARTED, label: 'Pendentes', count: counts[ProgressStatus.NOT_STARTED] },
            { value: ProgressStatus.IN_PROGRESS, label: 'Em andamento', count: counts[ProgressStatus.IN_PROGRESS] },
            { value: ProgressStatus.COMPLETED, label: 'Concluídos', count: counts[ProgressStatus.COMPLETED] },
          ]}
        />
        <div className="relative sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar treinamento..."
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonCards count={6} className="sm:grid-cols-2 lg:grid-cols-3" />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Nenhum treinamento aqui"
          description={q ? 'Tente outro termo de busca.' : 'Não há treinamentos nesta categoria no momento.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.enrollmentId} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
