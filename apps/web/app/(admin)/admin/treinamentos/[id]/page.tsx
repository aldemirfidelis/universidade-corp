'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Video,
  CheckCircle2,
  Send,
  Users,
  FileQuestion,
  Sparkles,
  Link2 as LinkIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, Progress } from '@/components/ui/misc';

interface FullCourse {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  requiresExam: boolean;
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      mandatory: boolean;
      video: { id: string; durationSeconds: number } | null;
    }>;
  }>;
}

export default function CourseEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [moduleTitle, setModuleTitle] = useState('');

  const { data: course } = useQuery({
    queryKey: ['course-edit', id],
    queryFn: () => api.get<FullCourse>(`/courses/${id}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['course-edit', id] });

  const addModule = useMutation({
    mutationFn: () =>
      api.post(`/courses/${id}/modules`, { title: moduleTitle, order: course?.modules.length ?? 0 }),
    onSuccess: () => {
      setModuleTitle('');
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const publish = useMutation({
    mutationFn: () => api.post(`/courses/${id}/publish`),
    onSuccess: () => {
      toast.success('Treinamento publicado!');
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const genStructure = useMutation({
    mutationFn: async () => {
      const outline = await api.post<{ modules: Array<{ title: string; lessons: string[] }> }>(
        '/ai/course-outline',
        { topic: course?.title },
      );
      let order = course?.modules.length ?? 0;
      for (const m of outline.modules ?? []) {
        const mod = await api.post<{ id: string }>(`/courses/${id}/modules`, { title: m.title, order: order++ });
        let lessonOrder = 0;
        for (const lessonTitle of m.lessons ?? []) {
          await api.post(`/courses/modules/${mod.id}/lessons`, {
            title: lessonTitle,
            type: 'VIDEO',
            order: lessonOrder++,
            mandatory: true,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success('Estrutura gerada com IA! Revise e anexe os vídeos.');
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!course) return <p className="text-slate-500">Carregando...</p>;

  const lessonCount = course.modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/treinamentos" className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={16} /> Treinamentos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <Badge tone={course.status === 'PUBLISHED' ? 'green' : 'amber'}>
            {course.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/treinamentos/${course.id}/prova`}>
            <Button variant="outline">
              <FileQuestion size={16} /> Prova
            </Button>
          </Link>
          <Link href={`/admin/turmas?courseId=${course.id}`}>
            <Button variant="outline">
              <Users size={16} /> Criar turma
            </Button>
          </Link>
          {course.status !== 'PUBLISHED' && (
            <Button onClick={() => publish.mutate()} disabled={lessonCount === 0 || publish.isPending}>
              <Send size={16} /> Publicar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Conteúdo</h2>
            <Button variant="subtle" size="sm" onClick={() => genStructure.mutate()} loading={genStructure.isPending}>
              <Sparkles size={15} /> Gerar estrutura com IA
            </Button>
          </div>

          {course.modules.length === 0 && !genStructure.isPending && (
            <p className="rounded-xl border border-dashed border-line bg-surface-muted/40 px-4 py-6 text-center text-sm text-muted">
              Comece adicionando módulos e aulas — ou gere uma estrutura inicial com IA e ajuste como quiser.
            </p>
          )}

          {course.modules.map((m) => (
            <ModuleBlock key={m.id} module={m} onChange={invalidate} />
          ))}

          <div className="flex gap-2 pt-2">
            <Input
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="Novo módulo (ex.: Boas Práticas de Fabricação)"
            />
            <Button
              variant="outline"
              onClick={() => moduleTitle && addModule.mutate()}
              disabled={addModule.isPending}
            >
              <Plus size={16} /> Módulo
            </Button>
          </div>
        </CardContent>
      </Card>

      {lessonCount === 0 && (
        <p className="text-sm text-amber-600">Adicione ao menos uma aula antes de publicar.</p>
      )}
    </div>
  );
}

function ModuleBlock({
  module,
  onChange,
}: {
  module: FullCourse['modules'][number];
  onChange: () => void;
}) {
  const [lessonTitle, setLessonTitle] = useState('');
  const [extOpen, setExtOpen] = useState(false);
  const [ext, setExt] = useState({ title: '', url: '' });

  const addLesson = useMutation({
    mutationFn: () =>
      api.post(`/courses/modules/${module.id}/lessons`, {
        title: lessonTitle,
        type: 'VIDEO',
        order: module.lessons.length,
        mandatory: true,
      }),
    onSuccess: () => {
      setLessonTitle('');
      onChange();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const addExternal = useMutation({
    mutationFn: () =>
      api.post(`/courses/modules/${module.id}/lessons`, {
        title: ext.title,
        type: 'EXTERNAL',
        order: module.lessons.length,
        mandatory: true,
        externalUrl: ext.url,
      }),
    onSuccess: () => {
      setExt({ title: '', url: '' });
      setExtOpen(false);
      onChange();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delModule = useMutation({
    mutationFn: () => api.del(`/courses/modules/${module.id}`),
    onSuccess: onChange,
  });

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">{module.title}</p>
        <button onClick={() => delModule.mutate()} className="text-slate-400 hover:text-red-500">
          <Trash2 size={16} />
        </button>
      </div>

      <ul className="space-y-2">
        {module.lessons.map((l) => (
          <LessonRow key={l.id} lesson={l} onChange={onChange} />
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <Input
          value={lessonTitle}
          onChange={(e) => setLessonTitle(e.target.value)}
          placeholder="Nova aula (ex.: Higiene pessoal)"
          className="h-9"
        />
        <Button
          variant="ghost"
          className="h-9"
          onClick={() => lessonTitle && addLesson.mutate()}
          disabled={addLesson.isPending}
        >
          <Plus size={14} /> Aula
        </Button>
      </div>

      <div className="mt-2">
        {!extOpen ? (
          <button onClick={() => setExtOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
            <LinkIcon size={13} /> Adicionar conteúdo externo (link / SCORM hospedado)
          </button>
        ) : (
          <div className="space-y-2 rounded-xl border border-dashed border-line bg-surface-muted/40 p-3">
            <Input value={ext.title} onChange={(e) => setExt({ ...ext, title: e.target.value })} placeholder="Título do conteúdo" className="h-9" />
            <Input value={ext.url} onChange={(e) => setExt({ ...ext, url: e.target.value })} placeholder="https://... (página, vídeo incorporável ou pacote SCORM hospedado)" className="h-9" />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-9"
                onClick={() => ext.title && ext.url && addExternal.mutate()}
                loading={addExternal.isPending}
                disabled={!ext.title || !ext.url}
              >
                <Plus size={14} /> Adicionar
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => setExtOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  onChange,
}: {
  lesson: FullCourse['modules'][number]['lessons'][number];
  onChange: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);

  const delLesson = useMutation({
    mutationFn: () => api.del(`/courses/lessons/${lesson.id}`),
    onSuccess: onChange,
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const duration = await readDuration(file).catch(() => 0);
    const form = new FormData();
    form.append('file', file);
    setPct(0);
    try {
      await api.upload(`/media/lessons/${lesson.id}/video?duration=${Math.round(duration)}`, form, setPct);
      toast.success('Vídeo enviado!');
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPct(null);
      e.target.value = '';
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <Video size={16} className="shrink-0 text-slate-400" />
      <span className="flex-1 truncate">{lesson.title}</span>
      {lesson.video ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 size={14} /> vídeo
        </span>
      ) : pct !== null ? (
        <div className="flex w-32 items-center gap-2">
          <Progress value={pct} className="h-2" />
          <span className="text-xs text-slate-500">{pct}%</span>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 text-xs text-brand">
          <Upload size={14} /> Enviar vídeo
        </button>
      )}
      <input ref={fileRef} type="file" accept="video/mp4,video/webm" hidden onChange={onPick} />
      <button onClick={() => delLesson.mutate()} className="text-slate-400 hover:text-red-500">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

/** Lê a duração do vídeo no navegador antes do upload. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error('metadata'));
    video.src = URL.createObjectURL(file);
  });
}
