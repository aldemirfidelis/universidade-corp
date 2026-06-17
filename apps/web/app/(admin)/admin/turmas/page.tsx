'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/misc';

interface ClassRow {
  id: string;
  name: string;
  course: { title: string };
  instructor: { name: string } | null;
  _count: { students: number };
}
interface Course {
  id: string;
  title: string;
}
interface Employee {
  id: string;
  name: string;
}

function TurmasInner() {
  const qc = useQueryClient();
  const preselect = useSearchParams().get('courseId') ?? '';
  const [show, setShow] = useState(!!preselect);

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get<ClassRow[]>('/classes') });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Turmas</h1>
        <Button onClick={() => setShow((s) => !s)}>
          <Plus size={16} /> Nova turma
        </Button>
      </div>

      {show && <NewClassForm preselect={preselect} onDone={() => { setShow(false); qc.invalidateQueries({ queryKey: ['classes'] }); }} />}

      <div className="grid gap-3">
        {(classes ?? []).map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Layers size={18} />
                </span>
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.course.title}</p>
                </div>
              </div>
              <Badge tone="blue">{c._count.students} aluno(s)</Badge>
            </CardContent>
          </Card>
        ))}
        {(classes ?? []).length === 0 && <p className="text-sm text-slate-500">Nenhuma turma criada.</p>}
      </div>
    </div>
  );
}

function NewClassForm({ preselect, onDone }: { preselect: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState(preselect);
  const [dueDate, setDueDate] = useState('');
  const [studentIds, setStudentIds] = useState<string[]>([]);

  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => api.get<Course[]>('/courses') });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => api.get<Employee[]>('/users') });

  const mut = useMutation({
    mutationFn: () =>
      api.post('/classes', {
        name,
        courseId,
        studentIds,
        dueDate: dueDate || undefined,
      }),
    onSuccess: () => {
      toast.success('Turma criada e funcionários inscritos!');
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function toggle(id: string) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!courseId) return toast.error('Selecione o treinamento');
            mut.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome da turma</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Treinamento</Label>
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
                <option value="">Selecione...</option>
                {(courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Prazo de conclusão</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Funcionários ({studentIds.length} selecionados)</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {(employees ?? []).map((u) => (
                <label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={studentIds.includes(u.id)} onChange={() => toggle(u.id)} />
                  {u.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Criando...' : 'Criar turma'}
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

export default function TurmasPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Carregando...</p>}>
      <TurmasInner />
    </Suspense>
  );
}
