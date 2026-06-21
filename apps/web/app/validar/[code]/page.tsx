'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

interface Validation {
  valid: boolean;
  code?: string;
  userName?: string;
  courseName?: string;
  companyName?: string;
  issuedAt?: string;
  validUntil?: string | null;
  workloadHours?: number | null;
  status?: string;
}

export default function ValidarPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['validate', code],
    queryFn: () => api.get<Validation>(`/certificates/validate/${code}`),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          <div className="mb-6 flex items-center gap-2 text-muted">
            <GraduationCap size={20} /> <span className="font-semibold">Validação de Certificado</span>
          </div>

          {isLoading ? (
            <p className="text-muted">Verificando...</p>
          ) : data?.valid ? (
            <div>
              <div className="mb-4 flex items-center gap-2 text-emerald-600">
                <ShieldCheck size={28} />
                <span className="text-lg font-bold">Certificado válido</span>
              </div>
              <dl className="space-y-2 text-sm">
                <Row label="Funcionário" value={data.userName} />
                <Row label="Treinamento" value={data.courseName} />
                <Row label="Empresa" value={data.companyName} />
                <Row label="Carga horária" value={data.workloadHours ? `${data.workloadHours}h` : '—'} />
                <Row label="Emitido em" value={data.issuedAt ? format(new Date(data.issuedAt), 'dd/MM/yyyy') : '—'} />
                <Row
                  label="Válido até"
                  value={data.validUntil ? format(new Date(data.validUntil), 'dd/MM/yyyy') : 'Sem expiração'}
                />
                <Row label="Código" value={data.code} mono />
              </dl>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-danger">
              <ShieldX size={28} />
              <span className="text-lg font-bold">Certificado não encontrado ou inválido</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? 'font-mono' : 'font-medium'}>{value ?? '—'}</dd>
    </div>
  );
}
