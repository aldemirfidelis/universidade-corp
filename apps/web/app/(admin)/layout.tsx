'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  Layers,
  Settings,
  LogOut,
  BarChart3,
  Award,
  Grid3x3,
  FileSpreadsheet,
  Clock,
  Menu,
  Route,
  LineChart,
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/components/auth-context';
import { NotificationBell } from '@/components/notification-bell';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Visão geral',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics', icon: LineChart },
    ],
  },
  { label: 'Pessoas', items: [{ href: '/admin/funcionarios', label: 'Funcionários', icon: Users }] },
  {
    label: 'Conteúdo',
    items: [
      { href: '/admin/treinamentos', label: 'Treinamentos', icon: BookOpen },
      { href: '/admin/trilhas', label: 'Trilhas', icon: Route },
      { href: '/admin/matriz', label: 'Matriz por Cargo', icon: Grid3x3 },
      { href: '/admin/turmas', label: 'Turmas', icon: Layers },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/admin/importacoes', label: 'Importações', icon: FileSpreadsheet },
      { href: '/admin/pendentes', label: 'Treinamentos Pendentes', icon: Clock },
      { href: '/admin/certificados', label: 'Certificados', icon: Award },
      { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
    ],
  },
  { label: 'Configurações', items: [{ href: '/admin/configuracoes', label: 'Configurações', icon: Settings }] },
];

function BrandHeader({ name }: { name?: string | null }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
        <GraduationCap size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{name ?? 'Universidade'}</p>
        <p className="text-xs text-muted">Administração</p>
      </div>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                    active
                      ? 'bg-brand/10 text-brand'
                      : 'text-slate-600 hover:bg-surface-muted hover:text-foreground',
                  )}
                >
                  <Icon size={18} className="shrink-0" /> {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

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
          <p className="truncate text-sm font-semibold text-foreground">{me?.name ?? 'Administrador'}</p>
          <p className="truncate text-xs text-muted">{me?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
  const [open, setOpen] = useState(false);
  const name = me?.branding?.universityName;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <BrandHeader name={name} />
        <NavLinks pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/80 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            {/* Hamburger mobile */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-surface-muted md:hidden">
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <BrandHeader name={name} />
                <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-semibold md:hidden">{name ?? 'Administração'}</span>
          </div>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
