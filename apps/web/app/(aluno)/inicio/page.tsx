'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarClock,
  RotateCw,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { ProgressStatus } from '@uc/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { ColabDashboard, MyCourse } from '@/lib/types';
import { CourseCard } from '@/components/course-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ui/misc';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonCards } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { assetUrl } from '@/lib/utils';

export default function InicioPage() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['colab-dashboard'],
    queryFn: () => api.get<ColabDashboard>('/learning/dashboard'),
  });

  const restart = useMutation({
    mutationFn: (courseId: string) => api.post(`/learning/courses/${courseId}/restart`),
    onSuccess: () => {
      toast.success('Treinamento reaberto para refazer.');
      qc.invalidateQueries({ queryKey: ['colab-dashboard'] });
    },
  });

  const t = data?.totals;
  const next = data?.pendentes.find((c) => c.progressStatus === ProgressStatus.IN_PROGRESS) ?? data?.pendentes[0];
  const nextCover = assetUrl(next?.course.coverUrl);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Olá, {me?.name?.split(' ')[0] ?? 'colaborador'} 👋</h1>
        <p className="text-muted">
          {isLoading
            ? 'Carregando seus treinamentos...'
            : (t?.pendentes ?? 0) > 0
              ? `Você tem ${t?.pendentes} treinamento(s) para concluir.`
              : 'Tudo em dia! Nenhum treinamento pendente. 🎉'}
        </p>
      </div>

      {next && (
        <Card className="overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <div className="relative h-40 w-full shrink-0 overflow-hidden bg-brand-gradient sm:h-auto sm:w-56">
              {nextCover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={nextCover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/90">
                  <BookOpen size={40} />
                </div>
              )}
            </div>
            <CardContent className="flex flex-1 flex-col justify-center p-6">
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                <Sparkles size={15} /> Continue de onde parou
              </p>
              <h2 className="mt-1 text-xl font-bold leading-snug">{next.course.title}</h2>
              <div className="mt-3 flex items-center gap-3">
                <ProgressRing value={next.progress} />
                <span className="text-sm text-muted">{next.progress}% concluído</span>
              </div>
              <Link href={`/treinamento/${next.course.id}`} className="mt-5">
                <Button size="lg" className="w-full sm:w-auto">
                  <PlayCircle size={20} /> Continuar treinamento <ArrowRight size={16} />
                </Button>
              </Link>
            </CardContent>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Clock size={20} />} tone="warning" label="Pendentes" value={t?.pendentes ?? 0} />
        <StatCard icon={<CheckCircle2 size={20} />} tone="success" label="Concluídos" value={t?.concluidos ?? 0} />
        <StatCard icon={<AlertTriangle size={20} />} tone="danger" label="Vencidos" value={t?.vencidos ?? 0} />
        <StatCard icon={<CalendarClock size={20} />} tone="info" label="Próx. vencimento" value={t?.proximosVencimentos ?? 0} />
      </div>

      {/* Vencidos — exigem retreinamento */}
      {(data?.vencidos.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-danger">
            <AlertTriangle size={18} /> Treinamentos vencidos
          </h3>
          <div className="grid gap-3">
            {data!.vencidos.map((c) => (
              <Card key={c.enrollmentId} className="border-red-200">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.course.title}</p>
                    <p className="text-xs text-danger">
                      Venceu em {c.validUntil ? format(new Date(c.validUntil), 'dd/MM/yyyy') : '—'} — refaça para renovar.
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => restart.mutate(c.course.id)} loading={restart.isPending}>
                    <RotateCw size={16} /> Refazer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Próximos vencimentos */}
      {(data?.proximosVencimentos.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-info">
            <CalendarClock size={18} /> Próximos vencimentos
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data!.proximosVencimentos.map((c) => (
              <CourseCard key={c.enrollmentId} c={c} />
            ))}
          </div>
        </section>
      )}

      {/* Lista geral */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Seus treinamentos</h3>
          <Link href="/meus-treinamentos" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <SkeletonCards count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
        ) : (data?.historico.length ?? 0) === 0 ? (
          <EmptyState
            icon={<BookOpen size={22} />}
            title="Nenhum treinamento atribuído ainda"
            description="Assim que um treinamento for atribuído a você, ele aparecerá aqui."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.historico ?? []).slice(0, 6).map((c: MyCourse) => (
              <CourseCard key={c.enrollmentId} c={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
