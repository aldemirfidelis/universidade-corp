'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Send, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/misc';

interface ImportResult {
  batchId: string;
  totalRows: number;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  skipped: number;
  errors: string[];
  processing?: boolean;
}

interface PendingOverview {
  totals: { pending: number; undispatched: number; dispatched: number };
  groups: Array<{
    area: string;
    areaValue: string | null;
    immediateSupervisor: string;
    immediateSupervisorValue: string | null;
    managerName: string;
    managerNameValue: string | null;
    pending: number;
    undispatched: number;
    dispatched: number;
    employees: number;
    courses: number;
  }>;
  recent: Array<{
    id: string;
    employee: string;
    registration: string;
    training: string;
    status: string | null;
    revisionValidity: string | null;
    area: string | null;
    immediateSupervisor: string | null;
    managerName: string | null;
    validUntil: string | null;
    dispatchedAt: string | null;
  }>;
  batches: Array<{
    id: string;
    type: string;
    fileName: string | null;
    totalRows: number;
    createdRows: number;
    updatedRows: number;
    unchangedRows: number;
    removedRows: number;
    skippedRows: number;
    createdAt: string;
    finishedAt: string | null;
  }>;
}

type UploadKind = 'employees' | 'training-status';

const importPath: Record<UploadKind, string> = {
  employees: '/apdata/employees/import',
  'training-status': '/apdata/training-status/import',
};

export default function ImportacoesPage() {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<Record<UploadKind, number>>({ employees: 0, 'training-status': 0 });
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const { data } = useQuery({
    queryKey: ['apdata-pending'],
    queryFn: () => api.get<PendingOverview>('/apdata/pending'),
    refetchInterval: 5000,
  });
  const hasRunningImport = (data?.batches ?? []).some((batch) => !batch.finishedAt);

  const uploadMut = useMutation({
    mutationFn: ({ kind, file }: { kind: UploadKind; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      setProgress((p) => ({ ...p, [kind]: 0 }));
      return api.upload<ImportResult>(importPath[kind], form, (pct) =>
        setProgress((p) => ({ ...p, [kind]: pct })),
      );
    },
    onSuccess: (result) => {
      setLastResult(result);
      if (result.processing) {
        toast.success('Planilha recebida. O processamento continua em segundo plano.');
      } else {
        toast.success(`Importação concluída: ${result.created} criados, ${result.updated} atualizados.`);
      }
      qc.invalidateQueries({ queryKey: ['apdata-pending'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const dispatchMut = useMutation({
    mutationFn: (group: PendingOverview['groups'][number]) =>
      api.post<{ dispatched: number; skipped: number }>('/apdata/pending/dispatch', {
        area: group.areaValue ?? undefined,
        immediateSupervisor: group.immediateSupervisorValue ?? undefined,
        managerName: group.managerNameValue ?? undefined,
      }),
    onSuccess: (result) => {
      toast.success(`${result.dispatched} treinamento(s) disparado(s).`);
      if (result.skipped) toast.warning(`${result.skipped} pendência(s) ignorada(s).`);
      qc.invalidateQueries({ queryKey: ['apdata-pending'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Importações APDATA</h1>
        <div className="flex flex-wrap gap-2">
          {hasRunningImport && <Badge tone="blue">Processando importação</Badge>}
          <Badge tone={data?.totals.undispatched ? 'amber' : 'green'}>
            {data?.totals.undispatched ?? 0} pendência(s) a disparar
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <UploadCard
          title="Superior imediato"
          icon={<FileSpreadsheet size={18} />}
          progress={progress.employees}
          loading={uploadMut.isPending || hasRunningImport}
          onFile={(file) => uploadMut.mutate({ kind: 'employees', file })}
        />
        <UploadCard
          title="Status dos treinamentos"
          icon={<AlertTriangle size={18} />}
          progress={progress['training-status']}
          loading={uploadMut.isPending || hasRunningImport}
          onFile={(file) => uploadMut.mutate({ kind: 'training-status', file })}
        />
      </div>

      {lastResult?.processing && (
        <Card>
          <CardContent className="p-4 text-sm text-slate-600">
            Importação iniciada. Acompanhe a contagem em Últimas importações.
          </CardContent>
        </Card>
      )}

      {lastResult && (
        <Card>
          <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <ResultMetric label="Linhas" value={lastResult.totalRows} />
            <ResultMetric label="Criados" value={lastResult.created} />
            <ResultMetric label="Atualizados" value={lastResult.updated} />
            <ResultMetric label="Inalterados" value={lastResult.unchanged} />
            <ResultMetric label="Removidos" value={lastResult.removed} />
            <ResultMetric label="Ignorados" value={lastResult.skipped} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={<AlertTriangle />} label="Pendentes APDATA" value={data?.totals.pending ?? 0} tone="amber" />
        <Metric icon={<Send />} label="A disparar" value={data?.totals.undispatched ?? 0} tone="blue" />
        <Metric icon={<CheckCircle2 />} label="Disparados" value={data?.totals.dispatched ?? 0} tone="green" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Superior imediato</th>
                  <th className="px-4 py-3">Gestor</th>
                  <th className="px-4 py-3">Colaboradores</th>
                  <th className="px-4 py-3">Treinamentos</th>
                  <th className="px-4 py-3">Pendências</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {(data?.groups ?? []).map((group) => (
                  <tr
                    key={`${group.area}-${group.immediateSupervisor}-${group.managerName}`}
                    className="border-b border-slate-100"
                  >
                    <td className="px-4 py-3 font-medium">{group.area}</td>
                    <td className="px-4 py-3 text-slate-600">{group.immediateSupervisor}</td>
                    <td className="px-4 py-3 text-slate-600">{group.managerName}</td>
                    <td className="px-4 py-3">{group.employees}</td>
                    <td className="px-4 py-3">{group.courses}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="amber">{group.pending} pendente(s)</Badge>
                        {group.dispatched > 0 && <Badge tone="green">{group.dispatched} disparado(s)</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        disabled={group.undispatched === 0 || dispatchMut.isPending || hasRunningImport}
                        onClick={() => dispatchMut.mutate(group)}
                      >
                        <Send size={14} /> Disparar
                      </Button>
                    </td>
                  </tr>
                ))}
                {(data?.groups ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Nenhuma pendência importada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <SectionTitle title="Pendências recentes" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {(data?.recent ?? []).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.employee}</p>
                        <p className="text-xs text-slate-500">{item.registration}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.training}</td>
                      <td className="px-4 py-3">
                        <Badge tone={item.dispatchedAt ? 'green' : 'amber'}>
                          {item.dispatchedAt ? 'Disparado' : 'Pendente'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(data?.recent ?? []).length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400">Sem registros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <SectionTitle title="Últimas importações" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {(data?.batches ?? []).map((batch) => (
                    <tr key={batch.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {batch.type === 'EMPLOYEES' ? 'Superior imediato' : 'Status dos treinamentos'}
                        </p>
                        <p className="text-xs text-slate-500">{batch.fileName ?? 'Planilha'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{batch.totalRows} linha(s)</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {batch.finishedAt ? (
                          new Date(batch.createdAt).toLocaleDateString('pt-BR')
                        ) : (
                          <Badge tone="blue">Processando</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(data?.batches ?? []).length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400">Sem importações.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UploadCard({
  title,
  icon,
  progress,
  loading,
  onFile,
}: {
  title: string;
  icon: React.ReactNode;
  progress: number;
  loading: boolean;
  onFile: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="text-brand">{icon}</span>
            {title}
          </div>
          <Button variant="outline" onClick={() => ref.current?.click()} disabled={loading}>
            <UploadCloud size={16} /> Importar Excel
          </Button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
        <input
          ref={ref}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
      </CardContent>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'amber' | 'blue' | 'green';
}) {
  const colors = {
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[tone]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="px-4 py-3 text-sm font-semibold text-slate-700">{title}</h2>;
}
