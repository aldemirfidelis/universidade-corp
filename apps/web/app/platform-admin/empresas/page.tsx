'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Plus, Users, BookOpen, Award } from 'lucide-react';
import { CompanyStatus } from '@uc/shared';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/misc';

interface CompanyRow {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string | null;
  status: CompanyStatus;
  plan: { id: string; name: string } | null;
  limits: { maxUsers: number; maxCourses: number; maxStorageMb: number } | null;
  usage: { users: number; courses: number; certificates: number; storageUsedMb: number };
  lastAccessAt: string | null;
}
interface Metrics {
  companies: number;
  activeCompanies: number;
  users: number;
  courses: number;
  certificates: number;
}

const statusTone = { ACTIVE: 'green', SUSPENDED: 'amber', INACTIVE: 'red' } as const;

export default function EmpresasPage() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);

  const { data: companies } = useQuery({ queryKey: ['pa-companies'], queryFn: () => api.get<CompanyRow[]>('/platform-admin/companies') });
  const { data: metrics } = useQuery({ queryKey: ['pa-metrics'], queryFn: () => api.get<Metrics>('/platform-admin/metrics') });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: CompanyStatus }) =>
      api.patch(`/platform-admin/companies/${v.id}/status`, { status: v.status }),
    onSuccess: () => {
      toast.success('Status atualizado');
      qc.invalidateQueries({ queryKey: ['pa-companies'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Empresas</h1>
        <Button onClick={() => setShow((s) => !s)}>
          <Plus size={16} /> Nova empresa
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Metric icon={<Building2 />} label="Empresas" value={metrics?.companies ?? 0} />
        <Metric icon={<Users />} label="Usuários" value={metrics?.users ?? 0} />
        <Metric icon={<BookOpen />} label="Treinamentos" value={metrics?.courses ?? 0} />
        <Metric icon={<Award />} label="Certificados" value={metrics?.certificates ?? 0} />
      </div>

      {show && <NewCompanyForm onDone={() => { setShow(false); qc.invalidateQueries({ queryKey: ['pa-companies'] }); }} />}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Uso</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(companies ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.tradeName}</p>
                      <p className="text-xs text-slate-400">{c.cnpj ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.plan?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.usage.users}/{c.limits?.maxUsers ?? '∞'} usuários
                      <br />
                      {c.usage.courses}/{c.limits?.maxCourses ?? '∞'} cursos
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        className="h-9 w-36"
                        value={c.status}
                        onChange={(e) => setStatus.mutate({ id: c.id, status: e.target.value as CompanyStatus })}
                      >
                        <option value="ACTIVE">Ativar</option>
                        <option value="SUSPENDED">Suspender</option>
                        <option value="INACTIVE">Inativar</option>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewCompanyForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    legalName: '',
    tradeName: '',
    cnpj: '',
    email: '',
    adminName: '',
    adminEmail: '',
  });

  const mut = useMutation({
    mutationFn: () => api.post<{ inviteToken: string }>('/platform-admin/companies', form),
    onSuccess: (r) => {
      toast.success('Empresa criada!', {
        description: `Link de 1º acesso do admin: /primeiro-acesso?token=${r.inviteToken}`,
      });
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardContent className="p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div>
            <Label>Razão social</Label>
            <Input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required />
          </div>
          <div>
            <Label>Nome fantasia</Label>
            <Input value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} required />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </div>
          <div>
            <Label>E-mail da empresa</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label>Nome do administrador</Label>
            <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />
          </div>
          <div>
            <Label>E-mail do administrador</Label>
            <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Criando...' : 'Criar empresa'}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
