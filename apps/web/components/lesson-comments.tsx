'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageCircle, Send, Trash2, CornerDownRight, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserRole } from '@uc/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Author {
  id: string;
  name: string;
  avatarUrl: string | null;
  isExpert: boolean;
}
interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
  replies?: Comment[];
}

const MODERATOR_ROLES: UserRole[] = [UserRole.INSTRUCTOR, UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN];

export function LessonComments({ lessonId }: { lessonId: string }) {
  const { me } = useAuth();
  const qc = useQueryClient();
  const key = ['lesson-comments', lessonId];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api.get<Comment[]>(`/discussions/lessons/${lessonId}/comments`),
  });

  const total = (data ?? []).reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);
  const canModerate = me ? MODERATOR_ROLES.includes(me.role) : false;

  const create = useMutation({
    mutationFn: (vars: { body: string; parentId?: string }) =>
      api.post(`/discussions/lessons/${lessonId}/comments`, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/discussions/comments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <MessageCircle size={18} className="text-brand" /> Perguntas e comentários
          {total > 0 && <span className="text-sm font-normal text-muted">({total})</span>}
        </h2>

        <Composer
          placeholder="Tem uma dúvida sobre esta aula? Pergunte aqui."
          loading={create.isPending}
          onSubmit={(body) => create.mutate({ body })}
        />

        <div className="mt-5 space-y-5">
          {isLoading && <p className="text-sm text-muted">Carregando comentários...</p>}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted">Seja o primeiro a comentar nesta aula.</p>
          )}
          {(data ?? []).map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              meId={me?.id}
              canModerate={canModerate}
              onReply={(body) => create.mutate({ body, parentId: c.id })}
              onDelete={(id) => remove.mutate(id)}
              replying={create.isPending}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CommentItem({
  comment,
  meId,
  canModerate,
  onReply,
  onDelete,
  replying,
}: {
  comment: Comment;
  meId?: string;
  canModerate: boolean;
  onReply: (body: string) => void;
  onDelete: (id: string) => void;
  replying: boolean;
}) {
  const [showReply, setShowReply] = useState(false);

  return (
    <div>
      <CommentBody comment={comment} meId={meId} canModerate={canModerate} onDelete={onDelete} />
      <div className="ml-11 mt-1">
        <button onClick={() => setShowReply((s) => !s)} className="text-xs font-medium text-brand hover:underline">
          Responder
        </button>
      </div>

      {showReply && (
        <div className="ml-11 mt-2">
          <Composer
            placeholder="Escreva uma resposta..."
            loading={replying}
            compact
            onSubmit={(body) => {
              onReply(body);
              setShowReply(false);
            }}
          />
        </div>
      )}

      {(comment.replies ?? []).length > 0 && (
        <div className="ml-6 mt-3 space-y-3 border-l-2 border-line pl-5">
          {comment.replies!.map((r) => (
            <div key={r.id} className="relative">
              <CornerDownRight size={14} className="absolute -left-[1.55rem] top-2 text-slate-300" />
              <CommentBody comment={r} meId={meId} canModerate={canModerate} onDelete={onDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentBody({
  comment,
  meId,
  canModerate,
  onDelete,
}: {
  comment: Comment;
  meId?: string;
  canModerate: boolean;
  onDelete: (id: string) => void;
}) {
  const canDelete = canModerate || comment.author.id === meId;
  return (
    <div className="flex gap-3">
      <Avatar name={comment.author.name} src={comment.author.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{comment.author.name}</span>
          {comment.author.isExpert && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[0.65rem] font-semibold text-brand">
              <ShieldCheck size={11} /> Instrutor
            </span>
          )}
          <span className="text-xs text-slate-400">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
          </span>
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="ml-auto text-slate-400 transition hover:text-danger"
              title="Remover"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <p
          className={cn(
            'mt-1 whitespace-pre-wrap rounded-xl px-3 py-2 text-sm',
            comment.author.isExpert ? 'bg-brand/[0.06] text-foreground' : 'bg-surface-muted/60',
          )}
        >
          {comment.body}
        </p>
      </div>
    </div>
  );
}

function Composer({
  onSubmit,
  placeholder,
  loading,
  compact,
}: {
  onSubmit: (body: string) => void;
  placeholder: string;
  loading?: boolean;
  compact?: boolean;
}) {
  const [body, setBody] = useState('');
  function submit() {
    const text = body.trim();
    if (!text) return;
    onSubmit(text);
    setBody('');
  }
  return (
    <div className={cn('flex flex-col gap-2', !compact && 'mt-4')}>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} loading={loading} disabled={!body.trim()}>
          <Send size={14} /> Enviar
        </Button>
      </div>
    </div>
  );
}
