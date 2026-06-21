'use client';

import { useQuery } from '@tanstack/react-query';
import { LineChart as LineChartIcon, UserCheck, BookOpen, CheckCircle2, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/misc';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Analytics {
  funnel: { enrolled: number; started: number; completed: number };
  compliance: { rate: number; mandatoryEnrollments: number; mandatoryCompleted: number };
  overdue: number;
  activeLearners: number;
  byCourse: Array<{ title: string; total: number; completed: number; rate: number }>;
  byCategory: Array<{ category: string; total: number; completed: number }>;
  completionByMonth: Array<{ month: string; count: number }>;
}

const TOOLTIP = { borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 10px 24px -6px rgb(15 23 42 / 0.12)' };

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: () => api.get<Analytics>('/dashboard/analytics') });

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Engajamento, compliance e desempenho por treinamento." icon={<LineChartIcon size={20} />} />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.5rem] rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<BookOpen size={20} />} tone="brand" label="Inscrições" value={data.funnel.enrolled} />
            <StatCard icon={<Activity size={20} />} tone="info" label="Iniciados" value={data.funnel.started} />
            <StatCard icon={<CheckCircle2 size={20} />} tone="success" label="Concluídos" value={data.funnel.completed} />
            <StatCard icon={<UserCheck size={20} />} tone="warning" label="Aprendizes ativos (30d)" value={data.activeLearners} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted">
                  <ShieldCheck size={18} className="text-brand" />
                  <p className="text-sm">Compliance (obrigatórios)</p>
                </div>
                <p className="mt-2 text-3xl font-bold">{data.compliance.rate}%</p>
                <Progress value={data.compliance.rate} className="mt-3" />
                <p className="mt-2 text-xs text-muted">
                  {data.compliance.mandatoryCompleted}/{data.compliance.mandatoryEnrollments} matrículas obrigatórias concluídas
                </p>
              </CardContent>
            </Card>
            <StatCard icon={<AlertTriangle size={20} />} tone="danger" label="Matrículas em atraso" value={data.overdue} />
            <StatCard
              icon={<CheckCircle2 size={20} />}
              tone="success"
              label="Taxa de conclusão geral"
              value={`${data.funnel.enrolled ? Math.round((data.funnel.completed / data.funnel.enrolled) * 100) : 0}%`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 font-semibold">Conclusões por mês</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.completionByMonth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="month" fontSize={12} stroke="var(--muted-foreground)" />
                      <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={TOOLTIP} />
                      <Bar dataKey="count" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 font-semibold">Matrículas por categoria</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <YAxis type="category" dataKey="category" width={110} fontSize={12} stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={TOOLTIP} />
                      <Bar dataKey="completed" stackId="a" fill="var(--brand)" radius={[0, 0, 0, 0]} name="Concluídas" />
                      <Bar dataKey="total" stackId="b" fill="#e2e8f0" radius={[0, 6, 6, 0]} name="Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Desempenho por treinamento</h2>
              {data.byCourse.length === 0 ? (
                <p className="text-sm text-muted">Sem matrículas ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Treinamento</TableHead>
                      <TableHead>Matrículas</TableHead>
                      <TableHead>Concluídas</TableHead>
                      <TableHead className="w-48">Conclusão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byCourse.map((c) => (
                      <TableRow key={c.title}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell className="text-muted">{c.total}</TableCell>
                        <TableCell className="text-muted">{c.completed}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={c.rate} size="sm" className="flex-1" />
                            <span className="w-9 text-right text-xs font-medium text-muted">{c.rate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
