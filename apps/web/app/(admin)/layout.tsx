'use client';

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
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/components/auth-context';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/funcionarios', label: 'Funcionários', icon: Users },
  { href: '/admin/treinamentos', label: 'Treinamentos', icon: BookOpen },
  { href: '/admin/importacoes', label: 'Importações', icon: FileSpreadsheet },
  { href: '/admin/matriz', label: 'Matriz por Cargo', icon: Grid3x3 },
  { href: '/admin/turmas', label: 'Turmas', icon: Layers },
  { href: '/admin/certificados', label: 'Certificados', icon: Award },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { me, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <GraduationCap size={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me?.branding?.universityName ?? 'Universidade'}</p>
            <p className="text-xs text-slate-400">Administração</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                  active ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="m-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50"
        >
          <LogOut size={18} /> Sair
        </button>
      </aside>

      <div className="flex-1">
        {/* Top bar mobile */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="font-semibold">{me?.branding?.universityName ?? 'Admin'}</span>
          <button onClick={logout} className="text-slate-500">
            <LogOut size={18} />
          </button>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</main>
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
