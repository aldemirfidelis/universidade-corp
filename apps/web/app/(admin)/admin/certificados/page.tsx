'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { api, apiBase } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/misc';

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
      <h1 className="text-2xl font-bold">Certificados emitidos</h1>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Funcionário</th>
                  <th className="px-4 py-3">Treinamento</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Emitido</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium">{c.user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.course.title}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                    <td className="px-4 py-3 text-slate-600">{format(new Date(c.issuedAt), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">
                      <Badge tone={c.status === 'VALID' ? 'green' : 'red'}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <a
                          href={`${apiBase}/certificates/${c.id}/pdf?token=${token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-brand"
                          title="Baixar PDF"
                        >
                          <Download size={16} />
                        </a>
                        <a
                          href={`/validar/${c.code}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-slate-500"
                          title="Validar"
                        >
                          <ShieldCheck size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {(data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Nenhum certificado emitido ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
