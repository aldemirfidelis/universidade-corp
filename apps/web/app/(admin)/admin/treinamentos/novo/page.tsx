'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Stepper } from '@/components/stepper';

interface Outline {
  description: string;
  objective: string;
  workloadHours: number;
}

export default function NovoTreinamentoPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    code: '',
    revisionDate: '',
    description: '',
    objective: '',
    workloadHours: 4,
    validityMonths: 12,
    mandatory: true,
    requiresExam: false,
  });

  const mut = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>('/courses', {
        ...form,
        code: form.code || undefined,
        revisionDate: form.revisionDate || undefined,
      }),
    onSuccess: (c) => {
      toast.success('Treinamento criado! Agora adicione o conteúdo.');
      router.push(`/admin/treinamentos/${c.id}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const ai = useMutation({
    mutationFn: () => api.post<Outline>('/ai/course-outline', { topic: form.title }),
    onSuccess: (o) => {
      setForm((f) => ({
        ...f,
        description: o.description,
        objective: o.objective,
        workloadHours: o.workloadHours || f.workloadHours,
      }));
      toast.success('Conteúdo sugerido pela IA preenchido!');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Stepper step={1} />
      <h1 className="text-2xl font-bold">Novo treinamento</h1>

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label>Título</Label>
              <div className="flex gap-2">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Segurança dos Alimentos"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.title && ai.mutate()}
                  disabled={ai.isPending}
                  title="Gerar descrição e objetivo com IA"
                >
                  <Sparkles size={16} /> {ai.isPending ? '...' : 'IA'}
                </Button>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Objetivo de aprendizagem</Label>
              <Textarea
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código do treinamento</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Ex.: TR-BPF-001"
                />
              </div>
              <div>
                <Label>Data de revisão</Label>
                <Input
                  type="date"
                  value={form.revisionDate}
                  onChange={(e) => setForm({ ...form, revisionDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Carga horária (h)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.workloadHours}
                  onChange={(e) => setForm({ ...form, workloadHours: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Validade (meses)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.validityMonths}
                  onChange={(e) => setForm({ ...form, validityMonths: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.mandatory}
                  onChange={(e) => setForm({ ...form, mandatory: e.target.checked })}
                />
                Obrigatório para os funcionários
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requiresExam}
                  onChange={(e) => setForm({ ...form, requiresExam: e.target.checked })}
                />
                Este treinamento exige prova (avaliação na Fase 3)
              </label>
            </div>
            <Button type="submit" size="lg" disabled={mut.isPending}>
              {mut.isPending ? 'Criando...' : 'Continuar'} <ArrowRight size={16} />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
