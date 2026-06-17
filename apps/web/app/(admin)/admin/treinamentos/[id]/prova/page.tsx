'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Sparkles, Save } from 'lucide-react';
import { QuestionType } from '@uc/shared';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

interface Assessment {
  id: string;
  title: string;
  passingScore: number;
  maxAttempts: number;
  questions: Array<{
    id: string;
    statement: string;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
}

export default function ProvaAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const qc = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ['course-title', courseId],
    queryFn: () => api.get<{ title: string }>(`/courses/${courseId}`),
  });
  const { data: assessment } = useQuery({
    queryKey: ['assessment', courseId],
    queryFn: () => api.get<Assessment | null>(`/assessments/course/${courseId}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['assessment', courseId] });

  const [config, setConfig] = useState({ passingScore: 70, maxAttempts: 3 });
  const saveConfig = useMutation({
    mutationFn: () => api.put(`/assessments/course/${courseId}`, { title: 'Avaliação', ...config }),
    onSuccess: () => {
      toast.success('Prova configurada');
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const genAI = useMutation({
    mutationFn: async () => {
      const a =
        assessment ??
        (await api.put<Assessment>(`/assessments/course/${courseId}`, { title: 'Avaliação', ...config }));
      const questions = await api.post<Array<{ statement: string; options: { text: string; isCorrect: boolean }[] }>>(
        '/ai/questions',
        { topic: course?.title ?? 'treinamento', count: 5 },
      );
      for (const q of questions) {
        await api.post(`/assessments/${a.id}/questions`, {
          type: QuestionType.SINGLE_CHOICE,
          statement: q.statement,
          weight: 1,
          options: q.options,
        });
      }
    },
    onSuccess: () => {
      toast.success('Questões geradas por IA!');
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delQuestion = useMutation({
    mutationFn: (qid: string) => api.del(`/assessments/questions/${qid}`),
    onSuccess: invalidate,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/admin/treinamentos/${courseId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Voltar ao treinamento
      </Link>
      <h1 className="text-2xl font-bold">Prova — {course?.title}</h1>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-5">
          <div>
            <Label>Nota mínima (%)</Label>
            <Input
              type="number"
              className="w-28"
              value={config.passingScore}
              onChange={(e) => setConfig({ ...config, passingScore: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Tentativas</Label>
            <Input
              type="number"
              className="w-28"
              value={config.maxAttempts}
              onChange={(e) => setConfig({ ...config, maxAttempts: Number(e.target.value) })}
            />
          </div>
          <Button variant="outline" onClick={() => saveConfig.mutate()}>
            <Save size={16} /> Salvar
          </Button>
          <Button onClick={() => genAI.mutate()} disabled={genAI.isPending}>
            <Sparkles size={16} /> {genAI.isPending ? 'Gerando...' : 'Gerar 5 questões com IA'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(assessment?.questions ?? []).map((q, i) => (
          <Card key={q.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {i + 1}. {q.statement}
                </p>
                <button onClick={() => delQuestion.mutate(q.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {q.options.map((o) => (
                  <li key={o.id} className={o.isCorrect ? 'font-medium text-emerald-600' : 'text-slate-600'}>
                    {o.isCorrect ? '✓ ' : '• '}
                    {o.text}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
        {assessment && assessment.questions.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma questão ainda. Use a IA ou adicione manualmente abaixo.</p>
        )}
      </div>

      {assessment && <NewQuestion assessmentId={assessment.id} onDone={invalidate} />}
      {!assessment && (
        <p className="text-sm text-slate-500">
          Salve a configuração ou gere questões com IA para criar a prova.
        </p>
      )}
    </div>
  );
}

function NewQuestion({ assessmentId, onDone }: { assessmentId: string; onDone: () => void }) {
  const [statement, setStatement] = useState('');
  const [options, setOptions] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const mut = useMutation({
    mutationFn: () =>
      api.post(`/assessments/${assessmentId}/questions`, {
        type: QuestionType.SINGLE_CHOICE,
        statement,
        weight: 1,
        options: options.filter((o) => o.text.trim()),
      }),
    onSuccess: () => {
      toast.success('Questão adicionada');
      setStatement('');
      setOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h3 className="font-semibold">Nova questão</h3>
        <Input value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="Enunciado" />
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={o.isCorrect}
              onChange={() => setOptions(options.map((x, j) => ({ ...x, isCorrect: j === i })))}
              title="Correta"
            />
            <Input
              value={o.text}
              onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              placeholder={`Alternativa ${i + 1}`}
              className="h-9"
            />
          </div>
        ))}
        <Button onClick={() => statement && mut.mutate()} disabled={mut.isPending}>
          <Plus size={16} /> Adicionar questão
        </Button>
      </CardContent>
    </Card>
  );
}
