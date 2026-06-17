'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  BookOpen,
  CheckCircle2,
  Award,
  AlertTriangle,
  TrendingUp,
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
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Overview>('/dashboard/overview'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Users />} label="Funcionários" value={data?.totalEmployees ?? 0} />
        <Metric icon={<BookOpen />} label="Treinamentos publicados" value={data?.publishedCourses ?? 0} />
        <Metric icon={<CheckCircle2 />} label="Conclusões" value={data?.completedEnrollments ?? 0} />
        <Metric icon={<Award />} label="Certificados" value={data?.certificates ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Adesão</p>
            <p className="mt-1 text-3xl font-bold">{data?.adherence ?? 0}%</p>
            <Progress value={data?.adherence ?? 0} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Conclusão</p>
            <p className="mt-1 text-3xl font-bold">{data?.completion ?? 0}%</p>
            <Progress value={data?.completion ?? 0} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Índice de aprovação</p>
            <p className="mt-1 text-3xl font-bold">{data?.approvalRate ?? 0}%</p>
            <p className="mt-2 text-xs text-slate-500">Média de notas: {data?.avgScore ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Controle de validade */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={<CheckCircle2 />} label="Treinamentos válidos" value={data?.validity?.valid ?? 0} />
        <Metric icon={<AlertTriangle className="text-amber-500" />} label="Próximos do vencimento" value={data?.validity?.expiring ?? 0} />
        <Metric icon={<AlertTriangle className="text-red-500" />} label="Vencidos" value={data?.validity?.expired ?? 0} />
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
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
