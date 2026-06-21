'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { api, apiBase } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge, Progress } from '@/components/ui/misc';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BarChart3 } from 'lucide-react';

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
      <PageHeader
        title="Relatórios"
        subtitle="Filtre, analise e exporte os dados de treinamento."
        icon={<BarChart3 size={20} />}
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={`${apiBase}/reports/export/enrollments.xlsx?${exportQs}`}>
              <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-medium shadow-sm transition hover:bg-surface-muted">
                <FileSpreadsheet size={16} /> Excel
              </span>
            </a>
            <a href={`${apiBase}/reports/export/enrollments.pdf?${exportQs}`}>
              <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-medium shadow-sm transition hover:bg-surface-muted">
                <FileText size={16} /> PDF
              </span>
            </a>
            <a href={`${apiBase}/reports/export/certificates.xlsx?token=${token}`}>
              <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-medium shadow-sm transition hover:bg-surface-muted">
                <Download size={16} /> Certificados
              </span>
            </a>
          </div>
        }
      />

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
                <span className="w-28 text-right text-xs text-muted">{d.completed}/{d.enrollments} ({d.completion}%)</span>
              </div>
            ))}
            {(byDept ?? []).length === 0 && <p className="text-sm text-muted">Sem dados.</p>}
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead>Treinamento</TableHead>
            <TableHead>%</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows ?? []).map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{r.employee}</TableCell>
              <TableCell className="text-muted">{r.position}</TableCell>
              <TableCell className="text-muted">{r.department}</TableCell>
              <TableCell className="text-muted">{r.course}</TableCell>
              <TableCell>{r.progress}%</TableCell>
              <TableCell className="text-muted">
                {r.validUntil ? new Date(r.validUntil).toLocaleDateString('pt-BR') : '—'}
              </TableCell>
              <TableCell>
                <Badge tone={r.overdue ? 'red' : statusTone[r.status] ?? 'slate'}>
                  {r.overdue ? 'Vencido' : r.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {(rows ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted">Sem registros.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
