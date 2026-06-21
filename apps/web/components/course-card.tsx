import Link from 'next/link';
import { BookOpen, Clock, CheckCircle2, PlayCircle, AlertTriangle, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { ProgressStatus } from '@uc/shared';
import type { MyCourse } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/misc';
import { assetUrl, cn } from '@/lib/utils';

export function CourseCard({ c, className }: { c: MyCourse; className?: string }) {
  const cover = assetUrl(c.course.coverUrl);
  const done = c.progressStatus === ProgressStatus.COMPLETED;
  const started = c.progress > 0;

  return (
    <Link href={`/treinamento/${c.course.id}`} className={cn('group block', className)}>
      <Card interactive className="flex h-full flex-col overflow-hidden">
        <div className="relative aspect-video w-full overflow-hidden bg-brand-gradient">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={c.course.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/90">
              <BookOpen size={34} />
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {c.mandatory && (
              <span className="rounded-full bg-amber-500/95 px-2 py-0.5 text-[0.65rem] font-semibold text-white shadow-sm">
                Obrigatório
              </span>
            )}
            {c.validity === 'EXPIRED' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600/95 px-2 py-0.5 text-[0.65rem] font-semibold text-white shadow-sm">
                <AlertTriangle size={11} /> Vencido
              </span>
            )}
            {c.validity === 'EXPIRING' && c.validUntil && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/95 px-2 py-0.5 text-[0.65rem] font-semibold text-white shadow-sm">
                <CalendarClock size={11} /> {format(new Date(c.validUntil), 'dd/MM')}
              </span>
            )}
          </div>
          {done && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[0.65rem] font-semibold text-white shadow-sm">
              <CheckCircle2 size={11} /> Concluído
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          {c.course.code && <p className="mb-0.5 text-[0.7rem] font-medium text-muted">{c.course.code}</p>}
          <p className="line-clamp-2 font-semibold leading-snug">{c.course.title}</p>

          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            {c.course.workloadHours ? (
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> {c.course.workloadHours}h
              </span>
            ) : null}
          </div>

          <div className="mt-auto pt-3">
            <Progress value={c.progress} size="sm" tone={c.validity === 'EXPIRED' ? 'danger' : 'brand'} />
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-muted">{c.progress}%</span>
              <span className="inline-flex items-center gap-1 font-medium text-brand">
                {done ? (
                  'Revisar'
                ) : (
                  <>
                    <PlayCircle size={13} /> {started ? 'Continuar' : 'Começar'}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
