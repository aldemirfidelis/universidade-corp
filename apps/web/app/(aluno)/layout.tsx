'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Home, BookOpen, Award, HelpCircle, Building2, LogOut, Compass, Trophy } from 'lucide-react';
import { AuthProvider, useAuth } from '@/components/auth-context';
import { NotificationBell } from '@/components/notification-bell';
import { GamificationChip } from '@/components/gamification-chip';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { assetUrl, cn } from '@/lib/utils';

const nav = [
  { href: '/academia', label: 'Academia', icon: Building2 },
  { href: '/inicio', label: 'Início', icon: Home },
  { href: '/catalogo', label: 'Catálogo', icon: Compass },
  { href: '/meus-treinamentos', label: 'Treinamentos', icon: BookOpen },
  { href: '/conquistas', label: 'Conquistas', icon: Trophy },
  { href: '/meus-certificados', label: 'Certificados', icon: Award },
];

function UserMenu() {
  const { me, logout } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-surface-muted">
          <Avatar name={me?.name} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="px-2.5 py-2">
          <p className="truncate text-sm font-semibold text-foreground">{me?.name ?? 'Colaborador'}</p>
          <p className="truncate text-xs text-muted">{me?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/ajuda">
            <HelpCircle size={16} /> Ajuda
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={logout}>
          <LogOut size={16} /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { me } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
          <Link href="/inicio" className="flex shrink-0 items-center gap-2">
            {me?.branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(me.branding.logoUrl)} alt="logo" className="h-8 w-auto" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                <GraduationCap size={18} />
              </span>
            )}
            <span className="hidden font-semibold sm:block">{me?.branding?.universityName ?? 'Universidade'}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                    active ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-surface-muted',
                  )}
                >
                  <Icon size={17} /> {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <GamificationChip />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-12">{children}</main>

      {/* Navegação inferior fixa (mobile-first, botões grandes) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.62rem] font-medium transition',
                  active ? 'text-brand' : 'text-slate-500',
                )}
              >
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition', active && 'bg-brand/10')}>
                  <Icon size={20} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
