'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, PlayCircle, CheckCircle2, Clock, AlertTriangle, CalendarClock, RotateCw } from 'lucide-react';
import { format } from 'date-fns';
import { ProgressStatus } from '@uc/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { ColabDashboard, MyCourse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, Progress } from '@/components/ui/misc';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {me?.name?.split(' ')[0] ?? 'colaborador'} 👋</h1>
        <p className="text-slate-500">
          {isLoading
            ? 'Carregando seus treinamentos...'
            : (t?.pendentes ?? 0) > 0
              ? `Você tem ${t?.pendentes} treinamento(s) para concluir.`
              : 'Tudo em dia! Nenhum treinamento pendente. 🎉'}
        </p>
      </div>

      {next && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-brand">Continue de onde parou</p>
            <h2 className="mt-1 text-xl font-bold">{next.course.title}</h2>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={next.progress} className="flex-1" />
              <span className="text-sm font-semibold text-slate-600">{next.progress}%</span>
            </div>
            <Link href={`/treinamento/${next.course.id}`}>
              <Button size="lg" className="btn-grande mt-5 w-full sm:w-auto">
                <PlayCircle size={22} /> Continuar treinamento <ArrowRight size={18} />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={<Clock className="text-amber-500" />} label="Pendentes" value={t?.pendentes ?? 0} />
        <StatCard icon={<CheckCircle2 className="text-emerald-500" />} label="Concluídos" value={t?.concluidos ?? 0} />
        <StatCard icon={<AlertTriangle className="text-red-500" />} label="Vencidos" value={t?.vencidos ?? 0} />
        <StatCard icon={<CalendarClock className="text-blue-500" />} label="Próx. vencimento" value={t?.proximosVencimentos ?? 0} />
      </div>

      {/* Vencidos — exigem retreinamento */}
      {(data?.vencidos.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-red-600">
            <AlertTriangle size={18} /> Treinamentos vencidos
          </h3>
          <div className="grid gap-3">
            {data!.vencidos.map((c) => (
              <Card key={c.enrollmentId} className="border-red-200">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{c.course.title}</p>
                    <p className="text-xs text-red-500">
                      Venceu em {c.validUntil ? format(new Date(c.validUntil), 'dd/MM/yyyy') : '—'} — refaça para renovar.
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => restart.mutate(c.course.id)} disabled={restart.isPending}>
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
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-blue-600">
            <CalendarClock size={18} /> Próximos vencimentos
          </h3>
          <div className="grid gap-3">
            {data!.proximosVencimentos.map((c) => (
              <CourseLine key={c.enrollmentId} c={c} tone="blue" />
            ))}
          </div>
        </section>
      )}

      {/* Pendentes */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Seus treinamentos</h3>
          <Link href="/meus-treinamentos" className="text-sm text-brand">Ver todos</Link>
        </div>
        <div className="grid gap-3">
          {(data?.historico ?? []).slice(0, 5).map((c) => (
            <CourseLine key={c.enrollmentId} c={c} />
          ))}
          {!isLoading && (data?.historico.length ?? 0) === 0 && (
            <p className="text-sm text-slate-500">Nenhum treinamento atribuído ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function CourseLine({ c, tone }: { c: MyCourse; tone?: 'blue' }) {
  return (
    <Link href={`/treinamento/${c.course.id}`}>
      <Card className={`transition hover:shadow-md ${tone === 'blue' ? 'border-blue-200' : ''}`}>
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{c.course.title}</p>
              {c.mandatory && <Badge tone="amber">Obrigatório</Badge>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={c.progress} className="w-40" />
              <span className="text-xs text-slate-500">
                {c.progress}%{c.validUntil ? ` · vence ${format(new Date(c.validUntil), 'dd/MM/yyyy')}` : ''}
              </span>
            </div>
          </div>
          <ArrowRight className="shrink-0 text-slate-400" />
        </CardContent>
      </Card>
    </Link>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">{icon}</div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
