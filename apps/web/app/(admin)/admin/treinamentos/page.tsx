'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';

interface CourseRow {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  mandatory: boolean;
  instructor: { name: string } | null;
  _count: { modules: number; enrollments: number };
}

const statusTone = { DRAFT: 'amber', PUBLISHED: 'green', ARCHIVED: 'slate' } as const;
const statusLabel = { DRAFT: 'Rascunho', PUBLISHED: 'Publicado', ARCHIVED: 'Arquivado' };

export default function TreinamentosPage() {
  const { data } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<CourseRow[]>('/courses'),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Treinamentos</h1>
        <Link href="/admin/treinamentos/novo">
          <Button>
            <Plus size={16} /> Novo treinamento
          </Button>
        </Link>
      </div>

      <div className="grid gap-3">
        {(data ?? []).map((c) => (
          <Link key={c.id} href={`/admin/treinamentos/${c.id}`}>
            <Card className="transition hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <BookOpen size={18} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.title}</p>
                      {c.mandatory && <Badge tone="amber">Obrigatório</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {c._count.modules} módulo(s) · {c._count.enrollments} matrícula(s)
                      {c.instructor ? ` · ${c.instructor.name}` : ''}
                    </p>
                  </div>
                </div>
                <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(data ?? []).length === 0 && (
          <p className="text-sm text-slate-500">Nenhum treinamento criado ainda.</p>
        )}
      </div>
    </div>
  );
}
