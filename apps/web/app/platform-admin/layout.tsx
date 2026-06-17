'use client';

import { ShieldCheck, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from '@/components/auth-context';

function Shell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} />
            <span className="font-semibold">Painel da Plataforma (Super Admin)</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-slate-300 hover:text-white">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
