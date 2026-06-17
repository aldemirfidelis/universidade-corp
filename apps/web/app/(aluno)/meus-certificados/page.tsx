'use client';

import { useQuery } from '@tanstack/react-query';
import { Award, Download } from 'lucide-react';
import { format } from 'date-fns';
import { api, apiBase } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Certificate } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/misc';

export default function MeusCertificadosPage() {
  const { data } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: () => api.get<Certificate[]>('/learning/certificates'),
  });

  const certs = data ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Meus Certificados</h1>

      {certs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-slate-500">
            <Award size={40} className="text-slate-300" />
            <p>Você ainda não possui certificados. Conclua um treinamento para liberá-los.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {certs.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Award className="text-brand" />
                  <Badge tone={c.status === 'VALID' ? 'green' : 'red'}>{c.status}</Badge>
                </div>
                <h2 className="mt-3 font-semibold">{c.course.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Código: <span className="font-mono">{c.code}</span>
                </p>
                <p className="text-xs text-slate-500">
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
