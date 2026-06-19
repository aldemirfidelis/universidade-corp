'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/misc';

interface Position { id: string; name: string }
interface Course { id: string; title: string; code?: string | null }
interface MatrixRow { positionId: string; positionName: string; courses: Course[] }

export default function MatrizPage() {
  const qc = useQueryClient();
  const [positionId, setPositionId] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: positions } = useQuery({ queryKey: ['positions'], queryFn: () => api.get<Position[]>('/companies/positions') });
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => api.get<Course[]>('/courses') });
  const { data: matrix } = useQuery({ queryKey: ['matrix'], queryFn: () => api.get<MatrixRow[]>('/matrix') });

  useEffect(() => {
    if (positionId && matrix) {
      const row = matrix.find((m) => m.positionId === positionId);
      setSelected(new Set((row?.courses ?? []).map((c) => c.id)));
    }
  }, [positionId, matrix]);

  const save = useMutation({
    mutationFn: () => api.put(`/matrix/position/${positionId}`, { positionId, courseIds: [...selected] }),
    onSuccess: () => {
      toast.success('Matriz salva! Colaboradores do cargo foram matriculados automaticamente.');
      qc.invalidateQueries({ queryKey: ['matrix'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const filteredCourses = (courses ?? []).filter((c) => {
    const term = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      (c.code ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Matriz de Treinamentos</h1>
        <p className="text-sm text-slate-500">
          Defina os treinamentos obrigatórios por cargo. Ao associar um colaborador a um cargo, eles
          são disponibilizados automaticamente.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cargo</label>
              <Select className="w-72" value={positionId} onChange={(e) => setPositionId(e.target.value)}>
                <option value="">Selecione um cargo...</option>
                {(positions ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            {positionId && (
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                <Save size={16} /> {save.isPending ? 'Salvando...' : 'Salvar matriz'}
              </Button>
            )}
          </div>

          {positionId && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Pesquisar treinamentos por título ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredCourses.map((c) => (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
                      selected.has(c.id) ? 'border-brand bg-brand/5' : 'border-slate-200'
                    }`}
                  >
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    <span className="flex-1">{c.title}</span>
                    {c.code && <Badge>{c.code}</Badge>}
                  </label>
                ))}
                {filteredCourses.length === 0 && (
                  <p className="text-sm text-slate-500 sm:col-span-2">Nenhum treinamento encontrado.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visão geral */}
      <div className="grid gap-3">
        {(matrix ?? []).filter((m) => m.courses.length > 0).map((m) => (
          <Card key={m.positionId}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-brand" />
                <p className="font-medium">{m.positionName}</p>
                <Badge tone="blue">{m.courses.length} treinamento(s)</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{m.courses.map((c) => c.title).join(' · ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
