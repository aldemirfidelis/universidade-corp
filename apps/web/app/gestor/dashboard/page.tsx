'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle2, Clock, AlertTriangle, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/misc';

interface TeamOverview {
  teamSize: number;
  trained: number;
  pending: number;
  expired: number;
  adherence: number;
  ranking: Array<{ name: string; completion: number }>;
}

export default function GestorDashboardPage() {
  const { data } = useQuery({ queryKey: ['team'], queryFn: () => api.get<TeamOverview>('/dashboard/team') });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Minha equipe</h1>

      {data?.teamSize === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Nenhum colaborador vinculado a você como gestor.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<Users />} label="Equipe" value={data?.teamSize ?? 0} />
            <Metric icon={<CheckCircle2 />} label="Treinados" value={data?.trained ?? 0} />
            <Metric icon={<Clock />} label="Pendentes" value={data?.pending ?? 0} />
            <Metric icon={<AlertTriangle />} label="Vencidos" value={data?.expired ?? 0} />
          </div>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Aderência da equipe</p>
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
                    <span className="w-6 text-sm font-semibold text-slate-400">{i + 1}º</span>
                    <span className="w-44 truncate text-sm">{r.name}</span>
                    <Progress value={r.completion} className="flex-1" />
                    <span className="w-12 text-right text-xs text-slate-500">{r.completion}%</span>
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

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
