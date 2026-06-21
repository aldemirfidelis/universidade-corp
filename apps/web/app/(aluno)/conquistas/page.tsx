'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Flame,
  Star,
  Medal,
  Rocket,
  CalendarCheck,
  Award,
  Zap,
  Lock,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/misc';
import { Avatar } from '@/components/ui/avatar';
import { Tabs } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ICONS: Record<string, typeof Star> = {
  Rocket,
  Flame,
  Medal,
  Star,
  CalendarCheck,
  Award,
};

interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  awardedAt: string | null;
}
interface GamProfile {
  points: number;
  level: number;
  levelProgress: number;
  pointsToNext: number;
  currentStreak: number;
  longestStreak: number;
  rank: number;
  badges: Badge[];
}
interface LeaderRow {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  level: number;
  isMe: boolean;
}

const MEDAL = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

export default function ConquistasPage() {
  const [scope, setScope] = useState<'company' | 'team'>('company');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['gamification-me'],
    queryFn: () => api.get<GamProfile>('/gamification/me'),
  });
  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', scope],
    queryFn: () => api.get<LeaderRow[]>(`/gamification/leaderboard?scope=${scope}`),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Conquistas" subtitle="Seu progresso, conquistas e ranking." icon={<Trophy size={20} />} />

      {/* Resumo */}
      {isLoading || !profile ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <Card className="overflow-hidden">
          <div className="bg-brand-gradient p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur">
                  {profile.level}
                </div>
                <div>
                  <p className="text-sm opacity-80">Nível {profile.level}</p>
                  <p className="text-2xl font-bold">{profile.points} pts</p>
                </div>
              </div>
              <div className="flex gap-6">
                <Stat icon={<Flame size={18} />} label="Sequência" value={`${profile.currentStreak}d`} />
                <Stat icon={<TrendingUp size={18} />} label="Recorde" value={`${profile.longestStreak}d`} />
                <Stat icon={<Trophy size={18} />} label="Ranking" value={`#${profile.rank}`} />
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-xs opacity-90">
                <span>Nível {profile.level}</span>
                <span>{profile.pointsToNext} pts para o nível {profile.level + 1}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${profile.levelProgress}%` }} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Badges */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Award size={18} className="text-brand" /> Conquistas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(profile?.badges ?? []).map((b) => {
            const Icon = ICONS[b.icon] ?? Award;
            return (
              <Card key={b.code} className={cn('p-4', !b.earned && 'opacity-60')}>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                      b.earned ? 'bg-brand/10 text-brand' : 'bg-surface-muted text-slate-400',
                    )}
                  >
                    {b.earned ? <Icon size={24} /> : <Lock size={20} />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-muted">{b.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Ranking */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Trophy size={18} className="text-brand" /> Ranking
          </h2>
          <Tabs
            value={scope}
            onValueChange={setScope}
            size="sm"
            items={[
              { value: 'company', label: 'Empresa' },
              { value: 'team', label: 'Minha equipe' },
            ]}
          />
        </div>
        <Card>
          <CardContent className="p-2">
            {(leaderboard ?? []).length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">Ainda não há pontuação para exibir.</p>
            ) : (
              <ul className="divide-y divide-line">
                {(leaderboard ?? []).map((r) => (
                  <li
                    key={r.userId}
                    className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', r.isMe && 'bg-brand/[0.06]')}
                  >
                    <span className={cn('w-6 text-center text-sm font-bold', MEDAL[r.rank - 1] ?? 'text-slate-400')}>
                      {r.rank}
                    </span>
                    <Avatar name={r.name} src={r.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {r.name}
                      {r.isMe && <span className="ml-1 text-xs text-brand">(você)</span>}
                    </span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted">
                      Nv {r.level}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                      <Zap size={14} /> {r.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-lg font-bold">
        {icon}
        {value}
      </div>
      <p className="text-[0.65rem] opacity-80">{label}</p>
    </div>
  );
}
