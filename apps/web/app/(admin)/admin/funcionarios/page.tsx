'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { UserPlus, Upload, Mail } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@uc/shared';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/misc';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Employee {
  id: string;
  name: string;
  email: string;
  registration: string | null;
  role: UserRole;
  accessStatus: string;
  department: { name: string } | null;
  position: { name: string } | null;
  inviteToken?: string;
}

export default function FuncionariosPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<Employee[]>('/users'),
  });

  const importMut = useMutation({
    mutationFn: (rows: Record<string, string>[]) =>
      api.post<{ created: number; skipped: number }>('/users/import', { rows }),
    onSuccess: (r) => {
      toast.success(`Importação concluída: ${r.created} criados, ${r.skipped} ignorados.`);
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => importMut.mutate(res.data),
      error: () => toast.error('Não foi possível ler o arquivo CSV'),
    });
    e.target.value = '';
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Funcionários"
        subtitle="Gerencie colaboradores, convites e perfis de acesso."
        icon={<UserPlus size={20} />}
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={onPickFile} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} loading={importMut.isPending}>
              <Upload size={16} /> Importar CSV
            </Button>
            <Button onClick={() => setShowForm((s) => !s)}>
              <UserPlus size={16} /> Novo funcionário
            </Button>
          </>
        }
      />

      <p className="text-xs text-muted">
        CSV com colunas: <code className="rounded bg-surface-muted px-1 py-0.5">nome, email, cpf, matricula, departamento, cargo</code>.
      </p>

      {showForm && <NewEmployeeForm onDone={() => setShowForm(false)} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="text-muted">{u.email}</TableCell>
              <TableCell className="text-muted">{u.department?.name ?? '—'}</TableCell>
              <TableCell>{ROLE_LABELS[u.role]}</TableCell>
              <TableCell>
                <Badge tone={u.accessStatus === 'ACTIVE' ? 'green' : u.accessStatus === 'PENDING' ? 'amber' : 'red'}>
                  {u.accessStatus === 'PENDING' ? 'Convite pendente' : u.accessStatus}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {(data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted">
                Nenhum funcionário cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function NewEmployeeForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{
    name: string;
    email: string;
    registration: string;
    area: string;
    unit: string;
    role: UserRole;
  }>({ name: '', email: '', registration: '', area: '', unit: '', role: UserRole.EMPLOYEE });

  const mut = useMutation({
    mutationFn: () => api.post<Employee>('/users', form),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Funcionário criado. Convite enviado por e-mail.', {
        description: u.inviteToken ? `Link de 1º acesso: /primeiro-acesso?token=${u.inviteToken}` : undefined,
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
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label>Matrícula</Label>
            <Input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} />
          </div>
          <div>
            <Label>Área</Label>
            <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div>
            <Label>Perfil</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {Object.values(UserRole)
                .filter((r) => r !== UserRole.SUPER_ADMIN)
                .map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
            </Select>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={mut.isPending}>
              <Mail size={16} /> {mut.isPending ? 'Salvando...' : 'Criar e enviar convite'}
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
