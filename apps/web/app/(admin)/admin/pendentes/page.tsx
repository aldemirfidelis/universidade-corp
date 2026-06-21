'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Send, Users, AlertCircle, ShieldAlert, CheckSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCards } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';

interface Enrollment {
  userId: string;
  courseId: string;
  employee: string;
  email: string;
  registration: string;
  position: string;
  department: string;
  area: string;
  unit: string;
  course: string;
  courseCode: string;
  status: string;
  progress: number;
  overdue: boolean;
  validity: string;
  validUntil: string | null;
}

interface GroupedTraining {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  employees: Enrollment[];
}

export default function PendentesPage() {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set()); // stores "userId:courseId"

  const { data: enrollments, isLoading, refetch } = useQuery({
    queryKey: ['reports-enrollments-active'],
    queryFn: () => api.get<Enrollment[]>('/reports/enrollments?status=ACTIVE'),
  });

  const notifyMutation = useMutation({
    mutationFn: (items: Array<{ userId: string; courseId: string }>) =>
      api.post<{ sent: number; skipped: number }>('/reports/notify-manager', { items }),
    onSuccess: (res) => {
      toast.success(`Notificações enviadas com sucesso! Enviado: ${res.sent} gestor(es). Ignorado (sem gestor): ${res.skipped}.`);
      setSelectedItems(new Set());
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao enviar notificações.');
    },
  });

  // Agrupamento por curso
  const grouped = new Map<string, GroupedTraining>();
  (enrollments ?? []).forEach((e) => {
    const key = e.courseId || e.course;
    const group = grouped.get(key) ?? {
      courseId: e.courseId,
      courseTitle: e.course,
      courseCode: e.courseCode,
      employees: [],
    };
    group.employees.push(e);
    grouped.set(key, group);
  });

  // Ordenação do maior número de pendências para o menor
  const sortedGroups = [...grouped.values()].sort((a, b) => b.employees.length - a.employees.length);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleItem = (userId: string, courseId: string) => {
    const key = `${userId}:${courseId}`;
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSelected = (userId: string, courseId: string) => {
    return selectedItems.has(`${userId}:${courseId}`);
  };

  const toggleAllInGroup = (groupEmployees: Enrollment[], courseId: string) => {
    const allSelected = groupEmployees.every((e) => isSelected(e.userId, courseId));
    setSelectedItems((prev) => {
      const next = new Set(prev);
      groupEmployees.forEach((e) => {
        const key = `${e.userId}:${courseId}`;
        if (allSelected) {
          next.delete(key);
        } else {
          next.add(key);
        }
      });
      return next;
    });
  };

  const handleSendSingle = (userId: string, courseId: string) => {
    notifyMutation.mutate([{ userId, courseId }]);
  };

  const handleSendSelected = () => {
    if (selectedItems.size === 0) return;
    const items = [...selectedItems].map((key) => {
      const [userId, courseId] = key.split(':');
      return { userId, courseId };
    });
    notifyMutation.mutate(items);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Treinamentos Pendentes"
        subtitle="Notifique gestores sobre treinamentos obrigatórios atrasados ou pendentes."
        icon={<Clock size={20} />}
        actions={
          selectedItems.size > 0 ? (
            <Button onClick={handleSendSelected} loading={notifyMutation.isPending}>
              <Send size={16} /> Enviar {selectedItems.size} ao gestor
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <SkeletonCards count={4} />
      ) : sortedGroups.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert size={22} />}
          title="Nenhuma pendência encontrada!"
          description="Todos os colaboradores estão em dia com a matriz de treinamentos."
        />
      ) : (
        <div className="space-y-3">
          {sortedGroups.map((group) => {
            const isOpen = openGroups.has(group.courseId);
            const groupAllSelected = group.employees.every((e) => isSelected(e.userId, group.courseId));
            const groupSomeSelected = group.employees.some((e) => isSelected(e.userId, group.courseId)) && !groupAllSelected;

            return (
              <Card key={group.courseId} className="overflow-hidden border border-slate-200">
                {/* Cabeçalho do Acordeon */}
                <div
                  className="flex cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 hover:bg-slate-100/80"
                  onClick={() => toggleGroup(group.courseId)}
                >
                  <div className="flex flex-1 items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = groupSomeSelected;
                        }
                      }}
                      checked={groupAllSelected}
                      onChange={() => toggleAllInGroup(group.employees, group.courseId)}
                      className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">{group.courseTitle}</span>
                      {group.courseCode && <Badge>{group.courseCode}</Badge>}
                      <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-2.5 py-0.5 font-medium">
                        <AlertCircle size={12} />
                        {group.employees.length} pendência(s)
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </div>

                {/* Conteúdo do Acordeon (Lista de colaboradores) */}
                {isOpen && (
                  <CardContent className="border-t border-slate-100 bg-white p-0">
                    <div className="divide-y divide-slate-100">
                      {group.employees.map((e) => (
                        <div
                          key={e.userId}
                          className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50/50"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected(e.userId, group.courseId)}
                              onChange={() => toggleItem(e.userId, group.courseId)}
                              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                            />
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{e.employee}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                                <span>Matrícula: {e.registration || '—'}</span>
                                <span>•</span>
                                <span>Cargo: {e.position}</span>
                                <span>•</span>
                                <span>Setor: {e.department}</span>
                                {e.overdue && (
                                  <>
                                    <span>•</span>
                                    <span className="font-medium text-rose-600">Treinamento Vencido</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendSingle(e.userId, group.courseId)}
                            disabled={notifyMutation.isPending}
                            className="text-xs border-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
                          >
                            <Send size={12} />
                            Enviar Treinamento
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
