'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, BookOpen, Clock, Compass, Plus, PlayCircle, CheckCircle2, ArrowRight, Sparkles, Route } from 'lucide-react';
import { ProgressStatus } from '@uc/shared';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, Progress } from '@/components/ui/misc';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCards } from '@/components/ui/skeleton';
import { assetUrl, cn } from '@/lib/utils';

interface CatalogItem {
  id: string;
  title: string;
  code: string | null;
  coverUrl: string | null;
  category: string | null;
  description: string | null;
  workloadHours: number | null;
  mandatory: boolean;
  requiresExam: boolean;
  enrolled: boolean;
  progress: number;
  progressStatus: ProgressStatus;
}

interface Recommendation {
  id: string;
  title: string;
  code: string | null;
  coverUrl: string | null;
  category: string | null;
  workloadHours: number | null;
  mandatory: boolean;
  reason: string;
}

interface LearnerPath {
  id: string;
  title: string;
  description: string | null;
  mandatory: boolean;
  total: number;
  completed: number;
  percent: number;
  courses: Array<{ id: string; title: string; completed: boolean }>;
}

export default function CatalogoPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => api.get<CatalogItem[]>('/learning/catalog'),
  });
  const { data: recs } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.get<Recommendation[]>('/learning/recommendations'),
  });
  const { data: paths } = useQuery({
    queryKey: ['learner-paths'],
    queryFn: () => api.get<LearnerPath[]>('/learning/paths'),
  });

  const enroll = useMutation({
    mutationFn: (courseId: string) => api.post(`/learning/courses/${courseId}/enroll`),
    onSuccess: () => {
      toast.success('Inscrição realizada! O treinamento está em "Meus Treinamentos".');
      qc.invalidateQueries({ queryKey: ['catalog'] });
      qc.invalidateQueries({ queryKey: ['recommendations'] });
      qc.invalidateQueries({ queryKey: ['my-courses'] });
      qc.invalidateQueries({ queryKey: ['colab-dashboard'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((c) => c.category && set.add(c.category));
    return Array.from(set).sort();
  }, [data]);

  const items = (data ?? []).filter((c) => {
    const term = q.trim().toLowerCase();
    const matchSearch = !term || c.title.toLowerCase().includes(term) || (c.code ?? '').toLowerCase().includes(term);
    const matchCat = cat === 'all' || c.category === cat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Catálogo" subtitle="Explore e inscreva-se nos treinamentos disponíveis." icon={<Compass size={20} />} />

      {q === '' && cat === 'all' && (recs?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Sparkles size={18} className="text-brand" /> Recomendados para você
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recs!.slice(0, 3).map((r) => (
              <RecommendationCard key={r.id} r={r} onEnroll={() => enroll.mutate(r.id)} enrolling={enroll.isPending} />
            ))}
          </div>
        </section>
      )}

      {q === '' && cat === 'all' && (paths?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Route size={18} className="text-brand" /> Trilhas de aprendizagem
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {paths!.map((p) => (
              <PathCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {categories.length > 0 && (
          <Tabs
            value={cat}
            onValueChange={setCat}
            items={[{ value: 'all', label: 'Todos' }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
        )}
        <div className="relative sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no catálogo..." className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <SkeletonCards count={6} className="sm:grid-cols-2 lg:grid-cols-3" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Nenhum treinamento encontrado"
          description={q ? 'Tente outro termo de busca.' : 'Ainda não há treinamentos publicados no catálogo.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CatalogCard key={c.id} c={c} onEnroll={() => enroll.mutate(c.id)} enrolling={enroll.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

function PathCard({ p }: { p: LearnerPath }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{p.title}</p>
            {p.mandatory && <Badge tone="amber">Obrigatória</Badge>}
          </div>
          {p.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{p.description}</p>}
        </div>
        <span className="shrink-0 text-sm font-semibold text-brand">{p.percent}%</span>
      </div>
      <Progress value={p.percent} className="mt-3" />
      <p className="mt-1.5 text-xs text-muted">
        {p.completed} de {p.total} treinamentos concluídos
      </p>
      <ol className="mt-3 space-y-1.5">
        {p.courses.map((c, i) => (
          <li key={c.id}>
            <Link
              href={`/treinamento/${c.id}`}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-surface-muted"
            >
              {c.completed ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              ) : (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[0.6rem] font-semibold text-slate-500">
                  {i + 1}
                </span>
              )}
              <span className={cn('truncate', c.completed && 'text-muted line-through')}>{c.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function RecommendationCard({ r, onEnroll, enrolling }: { r: Recommendation; onEnroll: () => void; enrolling: boolean }) {
  const cover = assetUrl(r.coverUrl);
  return (
    <Card interactive className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-brand-gradient">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={r.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/90">
            <BookOpen size={34} />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[0.65rem] font-semibold text-brand shadow-sm">
          <Sparkles size={11} /> {r.reason}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {r.code && <p className="mb-0.5 text-[0.7rem] font-medium text-muted">{r.code}</p>}
        <p className="line-clamp-2 font-semibold leading-snug">{r.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          {r.workloadHours ? (
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {r.workloadHours}h
            </span>
          ) : null}
          {r.mandatory && <Badge tone="amber">Obrigatório</Badge>}
        </div>
        <div className="mt-auto pt-3">
          <Button variant="subtle" className="w-full" onClick={onEnroll} loading={enrolling}>
            <Plus size={16} /> Inscrever-se
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CatalogCard({ c, onEnroll, enrolling }: { c: CatalogItem; onEnroll: () => void; enrolling: boolean }) {
  const cover = assetUrl(c.coverUrl);
  const done = c.progressStatus === ProgressStatus.COMPLETED;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-brand-gradient">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={c.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/90">
            <BookOpen size={34} />
          </div>
        )}
        {c.category && (
          <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[0.65rem] font-medium text-white backdrop-blur">
            {c.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {c.code && <p className="mb-0.5 text-[0.7rem] font-medium text-muted">{c.code}</p>}
        <p className="line-clamp-2 font-semibold leading-snug">{c.title}</p>
        {c.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{c.description}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          {c.workloadHours ? (
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {c.workloadHours}h
            </span>
          ) : null}
          {c.mandatory && <Badge tone="amber">Obrigatório</Badge>}
        </div>

        <div className="mt-auto pt-3">
          {c.enrolled ? (
            <Link href={`/treinamento/${c.id}`}>
              <Button variant={done ? 'secondary' : 'default'} className="w-full">
                {done ? (
                  <>
                    <CheckCircle2 size={16} /> Revisar
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} /> {c.progress > 0 ? 'Continuar' : 'Começar'} <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </Link>
          ) : (
            <Button variant="subtle" className="w-full" onClick={onEnroll} loading={enrolling}>
              <Plus size={16} /> Inscrever-se
            </Button>
          )}
          {c.enrolled && c.progress > 0 && !done && <Progress value={c.progress} size="sm" className="mt-2" />}
        </div>
      </div>
    </Card>
  );
}
