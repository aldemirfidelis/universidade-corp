'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Circle, PlayCircle, FileText, ChevronRight, FileQuestion } from 'lucide-react';
import { ProgressStatus } from '@uc/shared';
import { api, apiBase } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { CoursePlayer, LessonView } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [currentId, setCurrentId] = useState<string | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-player', id],
    queryFn: () => api.get<CoursePlayer>(`/learning/courses/${id}`),
  });

  const lessons = useMemo(() => course?.modules.flatMap((m) => m.lessons) ?? [], [course]);
  const current = lessons.find((l) => l.id === currentId) ?? lessons[0];
  const currentIndex = lessons.findIndex((l) => l.id === current?.id);
  const nextLesson = lessons[currentIndex + 1];

  useEffect(() => {
    if (!currentId && lessons.length) {
      const firstPending = lessons.find((l) => l.status !== ProgressStatus.COMPLETED);
      setCurrentId((firstPending ?? lessons[0]).id);
    }
  }, [lessons, currentId]);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ['course-player', id] });
    await qc.invalidateQueries({ queryKey: ['my-courses'] });
  }

  async function onCompleted(justCompletedCourse: boolean) {
    await refresh();
    if (justCompletedCourse) {
      toast.success('Parabéns! Treinamento concluído. Certificado liberado. 🏆');
    } else if (nextLesson) {
      toast.success('Aula concluída!');
    }
  }

  if (isLoading || !course) {
    return <p className="text-slate-500">Carregando treinamento...</p>;
  }

  return (
    <div className="space-y-5">
      <Link href="/meus-treinamentos" className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={course.progress} className="max-w-xs flex-1" />
          <span className="text-sm font-semibold text-slate-600">{course.progress}% concluído</span>
        </div>
        {course.requiresExam && (
          <Link href={`/prova/${course.id}`}>
            <Button variant="outline" className="mt-3">
              <FileQuestion size={16} /> Fazer prova do treinamento
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {current && (
            <LessonPlayer
              key={current.id}
              lesson={current}
              onProgressSaved={onCompleted}
              nextHref={nextLesson ? undefined : undefined}
            />
          )}

          {current && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold">{current.title}</h2>
                {current.contentText && (
                  <p className="mt-2 text-sm text-slate-600">{current.contentText}</p>
                )}
                {current.materials.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase text-slate-400">Materiais de apoio</p>
                    {current.materials.map((mat) => (
                      <a
                        key={mat.id}
                        href={`${apiBase}/media/file/${mat.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-brand hover:underline"
                      >
                        <FileText size={16} /> {mat.title}
                      </a>
                    ))}
                  </div>
                )}
                {nextLesson && (
                  <Button className="mt-5" onClick={() => setCurrentId(nextLesson.id)}>
                    Próxima aula <ChevronRight size={16} />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardContent className="p-3">
            <p className="px-2 py-2 text-xs font-medium uppercase text-slate-400">Aulas</p>
            <ul className="space-y-1">
              {lessons.map((l) => {
                const done = l.status === ProgressStatus.COMPLETED;
                const active = l.id === current?.id;
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => setCurrentId(l.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm',
                        active ? 'bg-brand/10 text-brand' : 'hover:bg-slate-50',
                      )}
                    >
                      {done ? (
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                      ) : active ? (
                        <PlayCircle size={18} className="shrink-0 text-brand" />
                      ) : (
                        <Circle size={18} className="shrink-0 text-slate-300" />
                      )}
                      <span className="truncate">{l.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LessonPlayer({
  lesson,
  onProgressSaved,
}: {
  lesson: LessonView;
  onProgressSaved: (justCompletedCourse: boolean) => void;
  nextHref?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSent = useRef(0);
  const maxWatched = useRef(lesson.lastPositionSeconds || 0);
  const [saving, setSaving] = useState(false);

  const token = getToken();
  const src = lesson.hasVideo ? `${apiBase}/media/stream/${lesson.id}?token=${token}` : null;

  async function send(watched: number, total: number, position: number) {
    try {
      const res = await api.post<{ courseCompleted: boolean }>(
        `/learning/lessons/${lesson.id}/progress`,
        { watchedSeconds: watched, totalSeconds: total, lastPositionSeconds: position },
      );
      onProgressSaved(res.courseCompleted);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    if (v.currentTime > maxWatched.current) maxWatched.current = v.currentTime;
    // Envia progresso a cada ~10s para não sobrecarregar.
    if (v.currentTime - lastSent.current >= 10) {
      lastSent.current = v.currentTime;
      void send(maxWatched.current, v.duration, v.currentTime);
    }
  }

  // Regra Goiasa: não permitir avanço integral do vídeo (bloqueia "pular" para frente).
  function onSeeking() {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime > maxWatched.current + 1.5) {
      v.currentTime = maxWatched.current;
      toast.info('Não é permitido adiantar o vídeo. Assista ao conteúdo completo.');
    }
  }

  async function markComplete() {
    setSaving(true);
    const total = lesson.durationSeconds || 60;
    await send(total, total, total);
    setSaving(false);
  }

  if (!src) {
    // Sem arquivo de vídeo (ex.: dados de demonstração): permite concluir manualmente.
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
          <PlayCircle size={48} className="text-slate-300" />
          <p className="text-sm text-slate-500">
            Vídeo de exemplo. Assista ao conteúdo e marque a aula como concluída.
          </p>
          {lesson.status === ProgressStatus.COMPLETED ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
              <CheckCircle2 size={18} /> Aula concluída
            </span>
          ) : (
            <Button size="lg" className="btn-grande" onClick={markComplete} disabled={saving}>
              {saving ? 'Salvando...' : 'Concluir aula'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        src={src}
        controls
        className="aspect-video w-full"
        onLoadedMetadata={() => {
          if (videoRef.current && lesson.lastPositionSeconds > 0) {
            videoRef.current.currentTime = lesson.lastPositionSeconds;
          }
        }}
        onTimeUpdate={onTimeUpdate}
        onSeeking={onSeeking}
        onEnded={() => {
          const v = videoRef.current;
          if (v) void send(v.duration, v.duration, v.duration);
        }}
      />
    </div>
  );
}
