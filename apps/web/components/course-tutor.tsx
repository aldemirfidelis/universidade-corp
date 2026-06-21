'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const SUGGESTIONS = ['Resuma os pontos principais', 'Não entendi um conceito', 'Dê um exemplo prático'];

export function CourseTutor({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const ask = useMutation({
    mutationFn: (q: string) => api.post<{ answer: string; ai: boolean }>('/ai/tutor', { courseId, question: q }),
    onSuccess: (res) => setMessages((m) => [...m, { role: 'ai', text: res.answer }]),
    onError: (e) => setMessages((m) => [...m, { role: 'ai', text: (e as Error).message }]),
  });

  function send(q: string) {
    const text = q.trim();
    if (!text || ask.isPending) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setQuestion('');
    ask.mutate(text);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Sparkles size={15} /> Tutor IA
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand" /> Tutor IA
          </DialogTitle>
          <DialogDescription>Tire dúvidas sobre &ldquo;{courseTitle}&rdquo;.</DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1 py-1">
          {messages.length === 0 && (
            <div className="rounded-xl bg-surface-muted/60 p-4 text-sm text-muted">
              <p>Olá! Sou seu tutor para este treinamento. Pergunte sobre o conteúdo das aulas.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium transition hover:bg-surface-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  m.role === 'ai' ? 'bg-brand/10 text-brand' : 'bg-surface-muted text-slate-500',
                )}
              >
                {m.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
              </span>
              <p
                className={cn(
                  'max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm',
                  m.role === 'ai' ? 'bg-surface-muted/70' : 'bg-brand text-brand-foreground',
                )}
              >
                {m.text}
              </p>
            </div>
          ))}

          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 size={16} className="animate-spin text-brand" /> Pensando...
            </div>
          )}
        </div>

        <div className="mt-2 flex items-end gap-2 border-t border-line pt-3">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(question);
              }
            }}
            placeholder="Escreva sua dúvida..."
            rows={1}
            className="min-h-[44px] resize-none"
          />
          <Button size="icon" onClick={() => send(question)} loading={ask.isPending} disabled={!question.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
