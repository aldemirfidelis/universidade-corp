'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Plus, Users, BookOpen, Award, ArrowRight, ArrowLeft, Check, Copy } from 'lucide-react';
import { CompanyStatus } from '@uc/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/misc';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
      <PageHeader
        title="Empresas"
        subtitle="Gerencie os clientes (tenants) da plataforma."
        icon={<Building2 size={20} />}
        actions={
          <Button onClick={() => setShow(true)}>
            <Plus size={16} /> Nova empresa
          </Button>
        }
      />

      <Dialog open={show} onOpenChange={setShow}>
        <DialogContent className="max-w-xl">
          <CompanyOnboardingWizard
            onDone={() => {
              setShow(false);
              qc.invalidateQueries({ queryKey: ['pa-companies'] });
              qc.invalidateQueries({ queryKey: ['pa-metrics'] });
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={<Building2 size={20} />} tone="brand" label="Empresas" value={metrics?.companies ?? 0} />
        <StatCard icon={<Users size={20} />} tone="info" label="Usuários" value={metrics?.users ?? 0} />
        <StatCard icon={<BookOpen size={20} />} tone="success" label="Treinamentos" value={metrics?.courses ?? 0} />
        <StatCard icon={<Award size={20} />} tone="warning" label="Certificados" value={metrics?.certificates ?? 0} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Uso</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(companies ?? []).map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <p className="font-medium">{c.tradeName}</p>
                <p className="text-xs text-slate-400">{c.cnpj ?? '—'}</p>
              </TableCell>
              <TableCell className="text-muted">{c.plan?.name ?? '—'}</TableCell>
              <TableCell className="text-xs text-muted">
                {c.usage.users}/{c.limits?.maxUsers ?? '∞'} usuários
                <br />
                {c.usage.courses}/{c.limits?.maxCourses ?? '∞'} cursos
              </TableCell>
              <TableCell>
                <Badge tone={statusTone[c.status]}>{c.status}</Badge>
              </TableCell>
              <TableCell>
                <Select
                  className="h-9 w-36"
                  value={c.status}
                  onChange={(e) => setStatus.mutate({ id: c.id, status: e.target.value as CompanyStatus })}
                >
                  <option value="ACTIVE">Ativar</option>
                  <option value="SUSPENDED">Suspender</option>
                  <option value="INACTIVE">Inativar</option>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface Plan {
  id: string;
  name: string;
}

function CompanyOnboardingWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [invite, setInvite] = useState<string | null>(null);
  const [form, setForm] = useState({
    legalName: '',
    tradeName: '',
    cnpj: '',
    email: '',
    segment: '',
    employeeCount: '',
    planId: '',
    adminName: '',
    adminEmail: '',
  });

  const { data: plans } = useQuery({ queryKey: ['pa-plans'], queryFn: () => api.get<Plan[]>('/platform-admin/plans') });

  const mut = useMutation({
    mutationFn: () =>
      api.post<{ inviteToken: string }>('/platform-admin/companies', {
        ...form,
        employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
        cnpj: form.cnpj || undefined,
        segment: form.segment || undefined,
        planId: form.planId || undefined,
      }),
    onSuccess: (r) => {
      toast.success('Empresa criada com sucesso!');
      setInvite(r.inviteToken);
      setStep(3);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const canStep1 = form.legalName.trim() && form.tradeName.trim() && form.email.trim();
  const canStep2 = form.adminName.trim() && form.adminEmail.trim();
  const inviteLink = invite ? `${typeof window !== 'undefined' ? window.location.origin : ''}/primeiro-acesso?token=${invite}` : '';

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Nova empresa</DialogTitle>
        <DialogDescription>
          {step === 3 ? 'Empresa criada — envie o convite ao administrador.' : 'Cadastre um novo cliente da plataforma.'}
        </DialogDescription>
      </DialogHeader>

      {step < 3 && (
        <div className="mb-5 flex items-center gap-2">
          {[1, 2].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  step >= n ? 'bg-brand text-brand-foreground' : 'bg-surface-muted text-muted',
                )}
              >
                {n}
              </span>
              <span className={cn('text-sm font-medium', step >= n ? 'text-foreground' : 'text-muted')}>
                {n === 1 ? 'Empresa' : 'Administrador'}
              </span>
              {n === 1 && <div className="h-px flex-1 bg-line" />}
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Razão social *</Label>
            <Input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} />
          </div>
          <div>
            <Label>Nome fantasia *</Label>
            <Input value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
          </div>
          <div>
            <Label>E-mail da empresa *</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Segmento</Label>
            <Input value={form.segment} onChange={(e) => set('segment', e.target.value)} placeholder="Indústria, Varejo..." />
          </div>
          <div>
            <Label>Nº de colaboradores</Label>
            <Input type="number" min={0} value={form.employeeCount} onChange={(e) => set('employeeCount', e.target.value)} />
          </div>
          <div>
            <Label>Plano</Label>
            <Select value={form.planId} onChange={(e) => set('planId', e.target.value)}>
              <option value="">Sem plano</option>
              {(plans ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button disabled={!canStep1} onClick={() => setStep(2)}>
              Continuar <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs text-muted">
              O administrador receberá um link de 1º acesso para criar a senha e configurar a academia.
            </p>
          </div>
          <div>
            <Label>Nome do administrador *</Label>
            <Input value={form.adminName} onChange={(e) => set('adminName', e.target.value)} />
          </div>
          <div>
            <Label>E-mail do administrador *</Label>
            <Input type="email" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button disabled={!canStep2} loading={mut.isPending} onClick={() => mut.mutate()}>
              <Check size={16} /> Criar empresa
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <Check size={30} />
          </div>
          <p className="text-sm text-muted">
            Empresa <strong className="text-foreground">{form.tradeName}</strong> criada. Compartilhe o link de
            primeiro acesso com <strong className="text-foreground">{form.adminEmail}</strong>:
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-muted p-2">
            <input readOnly value={inviteLink} className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none" />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(inviteLink);
                toast.success('Link copiado!');
              }}
            >
              <Copy size={14} /> Copiar
            </Button>
          </div>
          <Button className="w-full" onClick={onDone}>
            Concluir
          </Button>
        </div>
      )}
    </div>
  );
}
