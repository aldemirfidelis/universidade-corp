'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Route, Plus, Trash2, Send, ListOrdered, ArrowUp, ArrowDown, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/misc';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCards } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface PathRow {
  id: string;
  title: string;
  description: string | null;
  mandatory: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  _count: { courses: number };
}
interface PathDetail extends PathRow {
  courses: Array<{ id: string; order: number; course: { id: string; title: string } }>;
}
interface CourseOpt {
  id: string;
  title: string;
}

export default function TrilhasPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['paths'], queryFn: () => api.get<PathRow[]>('/learning-paths') });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['paths'] });

  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/learning-paths/${id}/publish`),
    onSuccess: () => {
      toast.success('Trilha publicada!');
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/learning-paths/${id}`),
    onSuccess: () => {
      toast.success('Trilha removida.');
      invalidate();
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trilhas"
        subtitle="Agrupe treinamentos em jornadas de aprendizagem sequenciais."
        icon={<Route size={20} />}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Nova trilha
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonCards count={3} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Route size={22} />}
          title="Nenhuma trilha criada"
          description="Crie uma trilha para guiar os colaboradores por uma sequência de treinamentos."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} /> Nova trilha
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Route size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.title}</p>
                      {p.mandatory && <Badge tone="amber">Obrigatória</Badge>}
                      <Badge tone={p.status === 'PUBLISHED' ? 'green' : 'slate'}>
                        {p.status === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted">{p._count.courses} treinamento(s)</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setManaging(p.id)}>
                    <ListOrdered size={15} /> Treinamentos
                  </Button>
                  {p.status !== 'PUBLISHED' && (
                    <Button size="sm" onClick={() => publish.mutate(p.id)} disabled={p._count.courses === 0}>
                      <Send size={15} /> Publicar
                    </Button>
                  )}
                  <button onClick={() => remove.mutate(p.id)} className="text-slate-400 transition hover:text-danger" title="Remover">
                    <Trash2 size={16} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreatePathDialog open={creating} onOpenChange={setCreating} onCreated={invalidate} />
      {managing && (
        <ManageCoursesDialog pathId={managing} onClose={() => setManaging(null)} onSaved={invalidate} />
      )}
    </div>
  );
}

function CreatePathDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ title: '', description: '', mandatory: false });
  const mut = useMutation({
    mutationFn: () => api.post('/learning-paths', { ...form, description: form.description || undefined }),
    onSuccess: () => {
      toast.success('Trilha criada! Agora adicione os treinamentos.');
      setForm({ title: '', description: '', mandatory: false });
      onOpenChange(false);
      onCreated();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova trilha</DialogTitle>
          <DialogDescription>Defina o nome e o objetivo da jornada.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Integração de novos colaboradores" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.mandatory} onChange={(e) => setForm({ ...form, mandatory: e.target.checked })} />
            Trilha obrigatória
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => form.title.trim() && mut.mutate()} loading={mut.isPending} disabled={!form.title.trim()}>
            Criar trilha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageCoursesDialog({ pathId, onClose, onSaved }: { pathId: string; onClose: () => void; onSaved: () => void }) {
  const { data: detail } = useQuery({ queryKey: ['path', pathId], queryFn: () => api.get<PathDetail>(`/learning-paths/${pathId}`) });
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => api.get<CourseOpt[]>('/courses') });
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (detail) setIds(detail.courses.map((c) => c.course.id));
  }, [detail]);

  const titleById = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const available = (courses ?? []).filter((c) => !ids.includes(c.id));

  const save = useMutation({
    mutationFn: () => api.put(`/learning-paths/${pathId}/courses`, { courseIds: ids }),
    onSuccess: () => {
      toast.success('Treinamentos da trilha atualizados.');
      onSaved();
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    setIds(next);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Treinamentos da trilha</DialogTitle>
          <DialogDescription>Defina a ordem em que os treinamentos devem ser feitos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {ids.length === 0 && <p className="text-sm text-muted">Nenhum treinamento adicionado ainda.</p>}
          {ids.map((cid, i) => (
            <div key={cid} className="flex items-center gap-2 rounded-xl border border-line bg-surface-muted/40 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{titleById.get(cid) ?? cid}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-400 disabled:opacity-30 hover:text-foreground">
                <ArrowUp size={15} />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === ids.length - 1} className="text-slate-400 disabled:opacity-30 hover:text-foreground">
                <ArrowDown size={15} />
              </button>
              <button onClick={() => setIds(ids.filter((x) => x !== cid))} className="text-slate-400 hover:text-danger">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        {available.length > 0 && (
          <div className="mt-3">
            <Label>Adicionar treinamento</Label>
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) setIds([...ids, e.target.value]);
              }}
            >
              <option value="">Selecione...</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Salvar trilha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
