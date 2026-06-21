'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { api, apiBase } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/misc';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip } from '@/components/ui/tooltip';

interface AdminCert {
  id: string;
  code: string;
  issuedAt: string;
  validUntil: string | null;
  status: string;
  user: { name: string };
  course: { title: string };
}

export default function AdminCertificadosPage() {
  const token = getToken();
  const { data } = useQuery({
    queryKey: ['admin-certs'],
    queryFn: () => api.get<AdminCert[]>('/certificates'),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Certificados emitidos"
        subtitle="Acompanhe e baixe os certificados gerados pela plataforma."
        icon={<ShieldCheck size={20} />}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Treinamento</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Emitido</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.user.name}</TableCell>
              <TableCell className="text-muted">{c.course.title}</TableCell>
              <TableCell className="font-mono text-xs">{c.code}</TableCell>
              <TableCell className="text-muted">{format(new Date(c.issuedAt), 'dd/MM/yyyy')}</TableCell>
              <TableCell>
                <Badge tone={c.status === 'VALID' ? 'green' : 'red'}>{c.status}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Tooltip content="Baixar PDF">
                    <a
                      href={`${apiBase}/certificates/${c.id}/pdf?token=${token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-brand transition hover:bg-brand/10"
                    >
                      <Download size={16} />
                    </a>
                  </Tooltip>
                  <Tooltip content="Validar publicamente">
                    <a
                      href={`/validar/${c.code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-muted"
                    >
                      <ShieldCheck size={16} />
                    </a>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {(data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted">
                Nenhum certificado emitido ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
