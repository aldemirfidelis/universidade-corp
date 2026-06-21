'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  BookOpen,
  CheckCircle2,
  Award,
  AlertTriangle,
  TrendingUp,
  Target,
  GraduationCap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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

interface Overview {
  totalEmployees: number;
  publishedCourses: number;
  mandatoryCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  pendingEnrollments: number;
  certificates: number;
  overdue: number;
  adherence: number;
  completion: number;
  avgScore: number;
  approvalRate: number;
  validity: { valid: number; expiring: number; expired: number };
  byArea: Array<{ area: string; completed: number; total: number }>;
  completionByMonth: Array<{ month: string; count: number }>;
}

const PIE = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Overview>('/dashboard/overview'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral dos treinamentos e indicadores da empresa."
        icon={<GraduationCap size={20} />}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.5rem] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Users size={20} />} tone="brand" label="Funcionários" value={data?.totalEmployees ?? 0} />
          <StatCard icon={<BookOpen size={20} />} tone="info" label="Treinamentos publicados" value={data?.publishedCourses ?? 0} />
          <StatCard icon={<CheckCircle2 size={20} />} tone="success" label="Conclusões" value={data?.completedEnrollments ?? 0} />
          <StatCard icon={<Award size={20} />} tone="warning" label="Certificados" value={data?.certificates ?? 0} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <PercentCard label="Adesão" value={data?.adherence ?? 0} icon={<Target size={18} />} />
        <PercentCard label="Conclusão" value={data?.completion ?? 0} icon={<CheckCircle2 size={18} />} />
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted">
              <Award size={18} className="text-brand" />
              <p className="text-sm">Índice de aprovação</p>
            </div>
            <p className="mt-2 text-3xl font-bold">{data?.approvalRate ?? 0}%</p>
            <p className="mt-2 text-xs text-muted">Média de notas: {data?.avgScore ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Controle de validade */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<CheckCircle2 size={20} />} tone="success" label="Treinamentos válidos" value={data?.validity?.valid ?? 0} />
        <StatCard icon={<AlertTriangle size={20} />} tone="warning" label="Próximos do vencimento" value={data?.validity?.expiring ?? 0} />
        <StatCard icon={<AlertTriangle size={20} />} tone="danger" label="Vencidos" value={data?.validity?.expired ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand" />
              <h2 className="font-semibold">Conclusões por mês</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.completionByMonth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 10px 24px -6px rgb(15 23 42 / 0.12)' }}
                  />
                  <Bar dataKey="count" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 font-semibold">Matrículas por área</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.byArea ?? []}
                    dataKey="total"
                    nameKey="area"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(e: { area: string }) => e.area}
                  >
                    {(data?.byArea ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE[i % PIE.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 10px 24px -6px rgb(15 23 42 / 0.12)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PercentCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted">
          <span className="text-brand">{icon}</span>
          <p className="text-sm">{label}</p>
        </div>
        <p className="mt-2 text-3xl font-bold">{value}%</p>
        <Progress value={value} className="mt-3" />
      </CardContent>
    </Card>
  );
}
