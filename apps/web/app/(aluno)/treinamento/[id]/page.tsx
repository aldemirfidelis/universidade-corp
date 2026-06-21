'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  ChevronRight,
  FileQuestion,
  Clock,
} from 'lucide-react';
import { ProgressStatus } from '@uc/shared';
import { api, apiBase } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { CoursePlayer, LessonView } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import { Skeleton } from '@/components/ui/skeleton';
import { LessonComments } from '@/components/lesson-comments';
import { CourseTutor } from '@/components/course-tutor';
import { assetUrl, cn } from '@/lib/utils';

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.round(seconds / 60);
  return m < 1 ? '< 1 min' : `${m} min`;
}

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
    await qc.invalidateQueries({ queryKey: ['colab-dashboard'] });
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
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-2/3" />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const completedCount = lessons.filter((l) => l.status === ProgressStatus.COMPLETED).length;

  return (
    <div className="space-y-5">
      <Link href="/meus-treinamentos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-[14rem] items-center gap-3">
            <Progress value={course.progress} className="max-w-xs flex-1" />
            <span className="whitespace-nowrap text-sm font-semibold text-muted">{course.progress}%</span>
          </div>
          <span className="text-sm text-muted">
            {completedCount}/{lessons.length} aulas
          </span>
          {course.requiresExam && (
            <Link href={`/prova/${course.id}`}>
              <Button variant="secondary" size="sm">
                <FileQuestion size={15} /> Fazer prova
              </Button>
            </Link>
          )}
          <CourseTutor courseId={course.id} courseTitle={course.title} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {current && <LessonPlayer key={current.id} lesson={current} onProgressSaved={onCompleted} />}

          {current && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold">{current.title}</h2>
                {current.contentText && <p className="mt-2 text-sm leading-relaxed text-muted">{current.contentText}</p>}
                {current.materials.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Materiais de apoio</p>
                    {current.materials.map((mat) => (
                      <a
                        key={mat.id}
                        href={assetUrl(`/api/media/file/${mat.path}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-muted/50 px-3 py-2 text-sm text-brand transition hover:bg-surface-muted"
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

          {current && <LessonComments lessonId={current.id} />}
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="p-3">
            <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Conteúdo do treinamento</p>
            <div className="space-y-3">
              {course.modules.map((mod) => (
                <div key={mod.id}>
                  {course.modules.length > 1 && (
                    <p className="px-2 pb-1 text-xs font-semibold text-muted">{mod.title}</p>
                  )}
                  <ul className="space-y-0.5">
                    {mod.lessons.map((l) => {
                      const done = l.status === ProgressStatus.COMPLETED;
                      const active = l.id === current?.id;
                      const dur = formatDuration(l.durationSeconds);
                      return (
                        <li key={l.id}>
                          <button
                            onClick={() => setCurrentId(l.id)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition',
                              active ? 'bg-brand/10 text-brand' : 'hover:bg-surface-muted',
                            )}
                          >
                            {done ? (
                              <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                            ) : active ? (
                              <PlayCircle size={18} className="shrink-0 text-brand" />
                            ) : (
                              <Circle size={18} className="shrink-0 text-slate-300" />
                            )}
                            <span className="min-w-0 flex-1 truncate">{l.title}</span>
                            {dur && (
                              <span className="inline-flex shrink-0 items-center gap-1 text-[0.68rem] text-slate-400">
                                <Clock size={11} /> {dur}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
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
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSent = useRef(0);
  const maxWatched = useRef(lesson.lastPositionSeconds || 0);
  const [saving, setSaving] = useState(false);

  const token = getToken();
  const src = lesson.hasVideo ? `${apiBase}/media/stream/${lesson.id}?token=${token}` : null;
  const isExternal = lesson.type === 'EXTERNAL' && !!lesson.externalUrl;

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

  if (isExternal) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-line bg-black shadow-card">
          <iframe
            src={lesson.externalUrl!}
            title={lesson.title}
            className="aspect-video w-full bg-white"
            allow="fullscreen; autoplay"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-muted">Conteúdo externo. Conclua a atividade e marque como concluída.</p>
          {lesson.status === ProgressStatus.COMPLETED ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
              <CheckCircle2 size={18} /> Concluída
            </span>
          ) : (
            <Button onClick={markComplete} loading={saving}>
              Marcar como concluída
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!src) {
    // Sem arquivo de vídeo (ex.: dados de demonstração): permite concluir manualmente.
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <PlayCircle size={32} />
          </div>
          <p className="text-sm text-muted">Vídeo de exemplo. Assista ao conteúdo e marque a aula como concluída.</p>
          {lesson.status === ProgressStatus.COMPLETED ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
              <CheckCircle2 size={18} /> Aula concluída
            </span>
          ) : (
            <Button size="lg" onClick={markComplete} loading={saving}>
              {saving ? 'Salvando...' : 'Concluir aula'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-black shadow-card">
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
