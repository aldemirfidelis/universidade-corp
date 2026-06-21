'use client';

import { useQuery } from '@tanstack/react-query';
import { Award, Download } from 'lucide-react';
import { format } from 'date-fns';
import { api, apiBase } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Certificate } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/misc';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export default function MeusCertificadosPage() {
  const { data } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: () => api.get<Certificate[]>('/learning/certificates'),
  });

  const certs = data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Meus Certificados" subtitle="Baixe e compartilhe seus certificados." icon={<Award size={20} />} />

      {certs.length === 0 ? (
        <EmptyState
          icon={<Award size={22} />}
          title="Você ainda não possui certificados"
          description="Conclua um treinamento para liberar seu primeiro certificado."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {certs.map((c) => (
            <Card key={c.id} interactive>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Award size={22} />
                  </span>
                  <Badge tone={c.status === 'VALID' ? 'green' : 'red'}>{c.status}</Badge>
                </div>
                <h2 className="mt-3 font-semibold">{c.course.title}</h2>
                <p className="mt-1 text-xs text-muted">
                  Código: <span className="font-mono">{c.code}</span>
                </p>
                <p className="text-xs text-muted">
                  Emitido em {format(new Date(c.issuedAt), 'dd/MM/yyyy')}
                  {c.workloadHours ? ` · ${c.workloadHours}h` : ''}
                </p>
                <a
                  href={`${apiBase}/certificates/${c.id}/pdf?token=${getToken()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  <Download size={16} /> Baixar PDF
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
