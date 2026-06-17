'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { api, apiBase } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge, Progress } from '@/components/ui/misc';

interface DeptRow { department: string; employees: number; enrollments: number; completed: number; completion: number }
interface EnrollmentRow {
  employee: string; registration: string; position: string; department: string;
  area: string; unit: string; course: string; status: string; progress: number;
  validUntil: string | null; overdue: boolean;
}
interface Course { id: string; title: string }
interface Position { id: string; name: string }

const statusTone: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  COMPLETED: 'green', ACTIVE: 'amber', EXPIRED: 'red', CANCELLED: 'slate',
};

export default function RelatoriosPage() {
  const token = getToken();
  const [f, setF] = useState({ status: '', courseId: '', positionId: '', area: '', unit: '', from: '', to: '' });

  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();

  const { data: byDept } = useQuery({ queryKey: ['rep-dept'], queryFn: () => api.get<DeptRow[]>('/reports/by-department') });
  const { data: rows } = useQuery({ queryKey: ['rep-enroll', qs], queryFn: () => api.get<EnrollmentRow[]>(`/reports/enrollments${qs ? `?${qs}` : ''}`) });
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => api.get<Course[]>('/courses') });
  const { data: positions } = useQuery({ queryKey: ['positions'], queryFn: () => api.get<Position[]>('/companies/positions') });

  const exportQs = `token=${token}${qs ? `&${qs}` : ''}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <div className="flex gap-2">
          <a href={`${apiBase}/reports/export/enrollments.xlsx?${exportQs}`}>
            <button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
              <FileSpreadsheet size={16} /> Excel
            </button>
          </a>
          <a href={`${apiBase}/reports/export/enrollments.pdf?${exportQs}`}>
            <button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
              <FileText size={16} /> PDF
            </button>
          </a>
          <a href={`${apiBase}/reports/export/certificates.xlsx?token=${token}`}>
            <button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
              <Download size={16} /> Certificados
            </button>
          </a>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <Label>Treinamento</Label>
            <Select value={f.courseId} onChange={(e) => setF({ ...f, courseId: e.target.value })}>
              <option value="">Todos</option>
              {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
          <div>
            <Label>Cargo</Label>
            <Select value={f.positionId} onChange={(e) => setF({ ...f, positionId: e.target.value })}>
              <option value="">Todos</option>
              {(positions ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="">Todos</option>
              <option value="ACTIVE">Em andamento</option>
              <option value="COMPLETED">Concluídos</option>
            </Select>
          </div>
          <div>
            <Label>Área</Label>
            <Input value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="Área" />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="Unidade" />
          </div>
          <div>
            <Label>De</Label>
            <Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">Adesão por setor</h2>
          <div className="space-y-3">
            {(byDept ?? []).map((d) => (
              <div key={d.department} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm">{d.department}</span>
                <Progress value={d.completion} className="flex-1" />
                <span className="w-28 text-right text-xs text-slate-500">{d.completed}/{d.enrollments} ({d.completion}%)</span>
              </div>
            ))}
            {(byDept ?? []).length === 0 && <p className="text-sm text-slate-500">Sem dados.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Funcionário</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Treinamento</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium">{r.employee}</td>
                    <td className="px-4 py-3 text-slate-600">{r.position}</td>
                    <td className="px-4 py-3 text-slate-600">{r.department}</td>
                    <td className="px-4 py-3 text-slate-600">{r.course}</td>
                    <td className="px-4 py-3">{r.progress}%</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.validUntil ? new Date(r.validUntil).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={r.overdue ? 'red' : statusTone[r.status] ?? 'slate'}>
                        {r.overdue ? 'Vencido' : r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(rows ?? []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sem registros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
