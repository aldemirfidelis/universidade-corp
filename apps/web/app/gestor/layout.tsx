'use client';

import Link from 'next/link';
import { Users, LogOut, BarChart3 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/components/auth-context';

function Shell({ children }: { children: React.ReactNode }) {
  const { me, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-brand" />
            <span className="font-semibold">Painel do Gestor</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin/relatorios" className="flex items-center gap-1 text-slate-500 hover:text-slate-900">
              <BarChart3 size={16} /> Relatórios
            </Link>
            <span className="text-slate-400">{me?.name}</span>
            <button onClick={logout} className="flex items-center gap-1 text-slate-500 hover:text-slate-900">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

export default function GestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
