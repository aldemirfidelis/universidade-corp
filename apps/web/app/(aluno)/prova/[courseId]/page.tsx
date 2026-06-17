'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, FileQuestion, CheckCircle2, XCircle, Award } from 'lucide-react';
import { QuestionType } from '@uc/shared';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExamState {
  hasExam: boolean;
  unlocked?: boolean;
  passed?: boolean;
  attemptsUsed?: number;
  maxAttempts?: number;
  passingScore?: number;
  canAttempt?: boolean;
  lastScore?: number | null;
}
interface Question {
  id: string;
  type: QuestionType;
  statement: string;
  imageUrl: string | null;
  options: Array<{ id: string; text: string }>;
}
interface StartedExam {
  attemptId: string;
  title: string;
  passingScore: number;
  questions: Question[];
}
interface ExamResult {
  score: number;
  passed: boolean;
  passingScore: number;
  certificateIssued: boolean;
}

export default function ProvaPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [exam, setExam] = useState<StartedExam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<ExamResult | null>(null);

  const { data: state, refetch } = useQuery({
    queryKey: ['exam-state', courseId],
    queryFn: () => api.get<ExamState>(`/exam/course/${courseId}/state`),
  });

  async function start() {
    try {
      const data = await api.post<StartedExam>(`/exam/course/${courseId}/start`);
      setExam(data);
      setAnswers({});
      setResult(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function select(q: Question, optionId: string) {
    const multi = q.type === QuestionType.MULTIPLE_CHOICE;
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      if (multi) {
        return { ...prev, [q.id]: cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId] };
      }
      return { ...prev, [q.id]: [optionId] };
    });
  }

  async function submit() {
    if (!exam) return;
    const payload = {
      answers: exam.questions.map((q) => ({ questionId: q.id, selectedOptionIds: answers[q.id] ?? [] })),
    };
    try {
      const res = await api.post<ExamResult>(`/exam/attempts/${exam.attemptId}/submit`, payload);
      setResult(res);
      setExam(null);
      refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/treinamento/${courseId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Voltar ao treinamento
      </Link>

      {/* Resultado */}
      {result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            {result.passed ? (
              <>
                <CheckCircle2 size={56} className="text-emerald-500" />
                <h1 className="text-2xl font-bold">Aprovado! 🎉</h1>
                <p className="text-slate-600">
                  Sua nota: <strong>{result.score}%</strong> (mínimo {result.passingScore}%)
                </p>
                {result.certificateIssued && (
                  <Link href="/meus-certificados">
                    <Button className="btn-grande mt-2">
                      <Award size={18} /> Ver meu certificado
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <>
                <XCircle size={56} className="text-red-500" />
                <h1 className="text-2xl font-bold">Não foi dessa vez</h1>
                <p className="text-slate-600">
                  Sua nota: <strong>{result.score}%</strong> (mínimo {result.passingScore}%). Revise o conteúdo e tente novamente.
                </p>
                <Button onClick={() => setResult(null)} variant="outline">
                  Voltar
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prova em andamento */}
      {exam && !result && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{exam.title}</h1>
          {exam.questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <p className="font-medium">
                  {i + 1}. {q.statement}
                </p>
                <div className="mt-3 space-y-2">
                  {q.options.map((o) => {
                    const checked = (answers[q.id] ?? []).includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
                          checked ? 'border-brand bg-brand/5' : 'border-slate-200'
                        }`}
                      >
                        <input
                          type={q.type === QuestionType.MULTIPLE_CHOICE ? 'checkbox' : 'radio'}
                          name={q.id}
                          checked={checked}
                          onChange={() => select(q, o.id)}
                        />
                        {o.text}
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button size="lg" className="btn-grande w-full" onClick={submit}>
            Enviar respostas
          </Button>
        </div>
      )}

      {/* Estado inicial */}
      {!exam && !result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <FileQuestion size={48} className="text-brand" />
            {!state?.hasExam ? (
              <p className="text-slate-500">Este treinamento não possui prova.</p>
            ) : state.passed ? (
              <>
                <h1 className="text-xl font-bold">Você já foi aprovado ✅</h1>
                <p className="text-slate-500">Nota: {state.lastScore}%</p>
                <Link href="/meus-certificados">
                  <Button variant="outline">
                    <Award size={16} /> Meus certificados
                  </Button>
                </Link>
              </>
            ) : !state.unlocked ? (
              <p className="text-amber-600">Conclua todas as aulas obrigatórias para liberar a prova.</p>
            ) : (
              <>
                <h1 className="text-xl font-bold">Prova do treinamento</h1>
                <p className="text-sm text-slate-500">
                  Nota mínima {state.passingScore}% · Tentativa {(state.attemptsUsed ?? 0) + 1} de {state.maxAttempts}
                </p>
                <Button size="lg" className="btn-grande" onClick={start} disabled={!state.canAttempt}>
                  Iniciar prova
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
