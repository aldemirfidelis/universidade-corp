'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle2, Clock, AlertTriangle, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/misc';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

interface TeamOverview {
  teamSize: number;
  trained: number;
  pending: number;
  expired: number;
  adherence: number;
  ranking: Array<{ name: string; completion: number }>;
}

const MEDAL = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

export default function GestorDashboardPage() {
  const { data } = useQuery({ queryKey: ['team'], queryFn: () => api.get<TeamOverview>('/dashboard/team') });

  return (
    <div className="space-y-6">
      <PageHeader title="Minha equipe" subtitle="Acompanhe o progresso dos seus colaboradores." icon={<Users size={20} />} />

      {data?.teamSize === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nenhum colaborador vinculado"
          description="Você ainda não tem colaboradores vinculados a você como gestor."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Users size={20} />} tone="brand" label="Equipe" value={data?.teamSize ?? 0} />
            <StatCard icon={<CheckCircle2 size={20} />} tone="success" label="Treinados" value={data?.trained ?? 0} />
            <StatCard icon={<Clock size={20} />} tone="warning" label="Pendentes" value={data?.pending ?? 0} />
            <StatCard icon={<AlertTriangle size={20} />} tone="danger" label="Vencidos" value={data?.expired ?? 0} />
          </div>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted">Aderência da equipe</p>
              <p className="mt-1 text-3xl font-bold">{data?.adherence ?? 0}%</p>
              <Progress value={data?.adherence ?? 0} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Trophy size={18} className="text-brand" />
                <h2 className="font-semibold">Ranking da equipe</h2>
              </div>
              <div className="space-y-2">
                {(data?.ranking ?? []).map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-6 text-sm font-bold ${MEDAL[i] ?? 'text-slate-300'}`}>{i + 1}º</span>
                    <span className="w-44 truncate text-sm">{r.name}</span>
                    <Progress value={r.completion} className="flex-1" />
                    <span className="w-12 text-right text-xs text-muted">{r.completion}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
