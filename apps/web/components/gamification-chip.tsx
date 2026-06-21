'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { api } from '@/lib/api';

interface GamProfile {
  points: number;
  level: number;
}

export function GamificationChip() {
  const { data } = useQuery({
    queryKey: ['gamification-me'],
    queryFn: () => api.get<GamProfile>('/gamification/me'),
    staleTime: 60_000,
  });
  if (!data) return null;

  return (
    <Link
      href="/conquistas"
      className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-surface-muted sm:inline-flex"
      title={`Nível ${data.level} · ${data.points} pontos`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-[0.6rem] text-brand">
        {data.level}
      </span>
      <span className="inline-flex items-center gap-0.5 text-brand">
        <Zap size={13} /> {data.points}
      </span>
    </Link>
  );
}
